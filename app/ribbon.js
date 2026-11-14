/* ArıtmaCAD — ŞERİT MENÜ (AutoCAD / ZWCAD ribbon gibi)
   Sekmeler (Giriş, Açıklama, İnşaat, Arıtma, 3B Modelleme, Pafta, Görünüm, Hesap) → paneller → büyük / küçük düğmeler.
   Büyük düğmelerde ▾ ile seçenekler, panel başlığında ▾ ile ek komutlar. Sekmeye çift tık: şeridi küçült / aç.
   3B sekmesine geçince "3B Modelleme" sekmesi açılır; soldaki uzun 3B araç sütunu gizlenir (komut satırını kapatmaz). */
(function (C) {
  'use strict';
  const $ = s => document.querySelector(s);
  const I0 = C.ICON || {};
  const EXTRA = {
    dot: '<circle cx="12" cy="12" r="2.5"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>',
    prop: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    lay3: '<path d="M12 3l9 5-9 5-9-5z M3 13l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    iso: '<path d="M4 12h16"/><circle cx="12" cy="12" r="3"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    orbit: '<ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M12 3v18"/><path d="M17 7l2-2 1 3"/>', sel: '<path d="M5 3l12 9-6 1 3 7-3 1-3-7-4 4z"/>',
    rail: '<path d="M3 7h18M3 13h18M5 7v13M12 7v13M19 7v13M3 19h18"/>',
    water: '<path d="M2 14c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 19c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M12 3c-2 3-4 5-4 7a4 4 0 0 0 8 0c0-2-2-4-4-7z"/>',
    stair: '<path d="M3 21h4v-4h4v-4h4V9h4V5h2"/><path d="M3 21V17"/>',
    brush: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/>',
    pp: '<rect x="5" y="10" width="14" height="10"/><path d="M12 9V2M9 5l3-3 3 3"/>', ext3: '<path d="M5 15h10l4-4H9z"/><path d="M5 15v4h10l4-4v-4"/>',
    uni: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>', sep: '<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/><path d="M12 6v12"/>',
    cut: '<path d="M4 20L20 4"/><rect x="3" y="7" width="10" height="13" stroke-dasharray="2 2"/>', plane: '<path d="M3 8l9-5 9 5-9 5z"/><path d="M12 13v8"/>',
    face: '<path d="M4 6h16v12H4z"/><path d="M4 6l16 12"/>', taper: '<path d="M8 4h8l3 16H5z"/>',
    col: '<rect x="8" y="3" width="8" height="18"/><path d="M8 7h8M8 17h8"/>', beam: '<path d="M2 9h20v6H2z"/>', found: '<path d="M3 14h18v5H3z"/><path d="M8 14V6h8v8"/>',
    slab: '<path d="M3 10l9-5 9 5-9 5z"/><path d="M3 10v3l9 5 9-5v-3"/>', win: '<rect x="4" y="5" width="16" height="14"/><path d="M12 5v14M4 12h16"/>', door: '<path d="M6 20V4h9v16"/><path d="M15 20a9 9 0 0 0-9-9"/><circle cx="13" cy="12" r=".8"/>',
    zoom: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>', zoomE: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6M7 10h6M10 7v6"/>', grid: '<path d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8"/><path d="M6 14h12v7H6z"/>', calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2"/>',
    earth: '<path d="M2 18l6-8 4 5 3-4 7 7z"/>', exc: '<path d="M2 8h5l3 8h4l3-8h5"/>', table: '<rect x="3" y="5" width="18" height="14"/><path d="M3 10h18M3 15h18M9 5v14"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>', side: '<rect x="3" y="4" width="18" height="16"/><path d="M15 4v16"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', pan: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7s-5-2-6.5-5L3 12.5a1.5 1.5 0 0 1 2.5-1.5L8 13"/>', snap: '<path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><rect x="9" y="9" width="6" height="6"/>',
  };
  const ic = k => `<svg viewBox="0 0 24 24">${I0[k] || EXTRA[k] || EXTRA.dot}</svg>`;
  /* düğme tanımları: [komut, etiket, ikon, (büyük?), (seçenekler [[komut, etiket]])] */
  const B = (cmd, t, i, opts) => ({ cmd, t, i, big: true, opts }), s = (cmd, t, i, opts) => ({ cmd, t, i, opts });
  const TABS = [
    ['Giriş', [
      ['Çiz', [B('LINE', 'Çizgi', 'line'), s('XLINE', 'Yardımcı çizgi', 'line', [['XLINE X', 'Yatay X'], ['XLINE Y', 'Yatay Y'], ['XLINE Z', 'Düşey Z'], ['XLINE A', 'Açılı'], ['XLINE O', 'Ofset'], ['XLINE', 'İki nokta']]), B('PLINE', 'Çoklu çizgi', 'pline'), B('CIRCLE', 'Daire', 'circle', [['CIRCLE', 'Merkez, yarıçap'], ['CIRCLE', 'Merkez, çap (D)'], ['ELLIPSE', 'Elips'], ['ELLIPSE M', 'Elips (merkezden)'], ['ELLIPSE Y', 'Eliptik yay']]), B('ARC', 'Yay', 'arc'),
        s('RECTANG', 'Dikdörtgen', 'rec'), s('ELLIPSE', 'Elips', 'ellipse'), s('POINT', 'Nokta', 'dot'), s('TARAMA', 'Tarama', 'hatch'), s('TEXT', 'Yazı', 'text'), s('MTEXT', 'Paragraf', 'mtext')],
        [['EGRIYAZI', 'Eğri boyunca yazı'], ['STYLE', 'Yazı stilleri'], ['TARAMASINIR', 'Tarama sınırı oluştur'], ['BLOKYAP', 'Blok oluştur'], ['BLOKEKLE', 'Blok ekle'], ['KUTUPHANE', 'Blok kütüphanesi']]],
      ['Değiştir', [B('MOVE', 'Taşı', 'move'), s('COPY', 'Kopyala', 'copy'), s('ROTATE', 'Döndür', 'rot'), s('MIRROR', 'Ayna', 'mirror'), s('SCALE', 'Ölçekle', 'scale'), s('OFFSET', 'Ötele', 'offset'), s('ARRAY', 'Dizi', 'array'),
        s('TRIM', 'Buda', 'trim'), s('EXTEND', 'Uzat', 'ext'), s('FILLET', 'Yuvarla', 'fillet'), s('CHAMFER', 'Pah', 'pah'), s('JOIN', 'Bağla', 'join'), s('ALIGN', 'Hizala', 'align'), s('EXPLODE', 'Patlat', 'explode'), s('ERASE', 'Sil', 'erase')]],
      ['Açıklama', [B('DIMLINEAR', 'Ölçü', 'dim', [['DIMLINEAR', 'Doğrusal'], ['DIMALIGNED', 'Hizalı'], ['DIMRADIUS', 'Yarıçap'], ['DIMDIAMETER', 'Çap'], ['DIMORDINATE', 'Koordinat'], ['QDIM', 'Otomatik ölçü']]), s('QDIM', 'Oto. ölçü', 'dim'), s('KOT', 'Kot', 'kot'), s('DIMORDINATE', 'Koordinat', 'koord')]],
      ['Katmanlar', [B('LAYER', 'Katman', 'layer'), s('LAYISO', 'Yalıt', 'iso'), s('LAYUNISO', 'Yalıtmayı kaldır', 'iso'), s('LAYOFF', 'Kapat', 'eye'), s('LAYON', 'Hepsini aç', 'eye'), s('MATCHPROP', 'Özellik kopyala', 'match')]],
      ['Özellikler', [B('PROPERTIES', 'Özellikler', 'prop'), s('LIST', 'Bilgi', 'prop'), s('DIST', 'Mesafe', 'dist'), s('AREA', 'Alan', 'area')]],
    ]],
    ['Açıklama', [
      ['Ölçü', [B('DIMLINEAR', 'Doğrusal', 'dim'), B('QDIM', 'Otomatik', 'dim'), s('DIMALIGNED', 'Hizalı', 'dimal'), s('DIMRADIUS', 'Yarıçap', 'dimr'), s('DIMDIAMETER', 'Çap', 'dimd'), s('AKS', 'Aks sistemi', 'dim')]],
      ['Kot ve koordinat', [B('KOT', 'Kot', 'kot'), B('DIMORDINATE', 'Koordinat', 'koord'), s('ID', 'Nokta sorgula', 'dot')]],
      ['Yazı', [B('TEXT', 'Yazı', 'text'), s('MTEXT', 'Paragraf', 'mtext'), s('EGRIYAZI', 'Eğri yazı', 'ctext'), s('STYLE', 'Stiller', 'style')]],
      ['Tarama', [B('TARAMA', 'Tarama', 'hatch'), s('TARAMASINIR', 'Sınır', 'hatch')]],
      ['Açıklama ölçeği', [B('OLCEK', 'Ölçek', 'scale'), s('OLCEKEKLE', 'Ölçek ekle', 'scale'), s('OLCEKCIKAR', 'Ölçek çıkar', 'scale'), s('OLCEKAYAR', 'Ayarlar', 'prop')]],
      ['Ölçme', [B('DIST', 'Mesafe', 'dist'), s('AREA', 'Alan', 'area'), s('LIST', 'Bilgi', 'prop')]],
    ]],
    ['İnşaat', [
      ['Taşıyıcı sistem', [B('MERDIVEN', 'Merdiven', 'stair', [['MERDIVEN TIP=beton', 'Betonarme'], ['MERDIVEN TIP=izgara', 'Çelik ızgaralı'], ['MERDIVEN TIP=ctp', 'CTP (FRP)'], ['MERDIVEN SEKIL=helezon', 'Helezon']]), B('KORKULUK', 'Korkuluk', 'rail'), B('MALZEME', 'Malzeme dokusu', 'brush'), B('ELEMANYAP', 'Çizgiden eleman', 'ext3', [['ELEMANYAP TIP=PERDE', 'Perde'], ['ELEMANYAP TIP=DUVAR', 'Duvar'], ['ELEMANYAP TIP=KIRIS', 'Kiriş'], ['ELEMANYAP TIP=STEMEL', 'Sürekli temel'], ['ELEMANYAP TIP=RADYE', 'Radye'], ['ELEMANYAP TIP=DOSEME', 'Döşeme'], ['ELEMANYAP TIP=KOLON', 'Kolon'], ['ELEMANYAP TIP=TTEMEL', 'Tekil temel']]), B('TEMEL', 'Temel', 'found', [['TEMEL TIP=R', 'Radye'], ['TEMEL TIP=S', 'Sürekli'], ['TEMEL TIP=T', 'Tekil']]), B('PERDE', 'Perde', 'wall', [['PERDE', 'Düz / köşeli perde'], ['DAIRESELPERDE', 'Dairesel perde (tam daire / yay)']]), B('KOLON', 'Kolon', 'col'), B('KIRIS', 'Kiriş', 'beam'), B('OTOKIRIS', 'Kolonlardan kiriş', 'beam', [['OTOKIRIS DOS=YOK', 'Yalnız kirişler'], ['OTOKIRIS DOS=NORMAL', 'Kiriş + döşeme'], ['OTOKIRIS DOS=CATI SACAK=60', 'Kiriş + çatı döşemesi (60 cm saçaklı)'], ['OTOKIRIS DOS=CATI SACAK=60 PH=0', 'Kiriş + saçaklı çatı döşemesi (parapetsiz, eğimli çatı için)'], ['OTOKIRIS DOS=NORMAL SACAK=60', 'Kiriş + döşeme (60 cm saçaklı)'], ['OTOKIRIS', 'Ayarlar…']]), B('IDOSEME', 'Döşeme', 'slab'), B('ICATI', 'Çatı döşemesi', 'slab', [['ICATI PH=1', 'Parapet 1.00 m'], ['ICATI PH=0.5', 'Parapet 0.50 m'], ['ICATI', 'Ayarlar…']]), B('IDOLGU', 'Sıkıştırılmış dolgu', 'slab', [['IDOLGU', 'Tıklanan iç alan'], ['IDOLGU T', 'Tüm iç alanlar']])]],
      ['Duvar ve doğrama', [B('IDUVAR', 'Duvar', 'wall'), B('PENCERE', 'Pencere', 'win'), B('KAPI', 'Kapı', 'door'), B('SEKSIYONELKAPI', 'Seksiyonel kapı', 'door'), B('CELIKKAPI', 'Çelik kapı', 'door')]],
      ['Kaplama (ince işler)', [B('ZEMINKAPLAMA', 'Zemin kaplama', 'slab', [['ZEMINKAPLAMA', 'Tıklanan oda'], ['ZEMINKAPLAMA T', 'Tüm odalar']]), B('DUVARKAPLAMA', 'Sıva / boya', 'wall', [['DUVARKAPLAMA YON=IC', 'İç duvarlar'], ['DUVARKAPLAMA YON=DIS', 'Dış cephe']]), B('TAVANKAPLAMA', 'Tavan', 'slab', [['TAVANKAPLAMA', 'Tıklanan oda'], ['TAVANKAPLAMA T', 'Tüm odalar']])]],
      ['Çatı', [B('CATI', 'Çatı', 'slab', [['CATI TUR=kirma', 'Kırma çatı'], ['CATI TUR=besik', 'Beşik çatı'], ['CATI TUR=tek', 'Tek eğimli (sundurma)'], ['CATI TUR=mansart', 'Mansart (çatı katı)'], ['CATI TUR=kirma KAT=KULLANILIR', 'Kullanılabilir çatı arası (ayak duvarlı)'], ['CATI TUR=teras', 'Teras çatı'], ['CATI', 'Ayarlar…']]), B('CATIPAFTA', 'Çatı paftası', 'print')]],
      ['DXF → 3B', [B('2B3B', 'Plan + kesitten 3B', 'ext3'), B('DXFMODEL', 'Plandan 3B model', 'ext3'), s('DXFMODELREF', 'Referansı sıfırla', 'rot')]],
      ['Çevre', [B('TRETUVAR', 'Tretuvar', 'slab', [['TRETUVAR', 'Tretuvar (ayarlar…)'], ['TRETUVAR W=100 KAP=karo', 'Beton karo, 100 cm'], ['TRETUVAR W=120 KAP=parke', 'Kilitli parke, 120 cm'], ['TRETUVAR W=100 KAP=beton', 'Perdahlı beton, 100 cm']]), B('TRETUVARDETAY', 'Tretuvar detayı', 'print')]],
      ['Yalıtım', [B('CEPHEYALITIM', 'Dış cephe', 'wall'), B('CATIYALITIM', 'Çatı / teras', 'slab', [['CATIYALITIM', 'Tıklanan çatı'], ['CATIYALITIM T', 'Tüm çatılar']]), B('ZEMINYALITIM', 'Zemin altı', 'slab', [['ZEMINYALITIM', 'Tıklanan oda'], ['ZEMINYALITIM T', 'Tüm odalar']]), B('TEMELYALITIM', 'Temel', 'found', [['TEMELYALITIM', 'Tıklanan temel'], ['TEMELYALITIM T', 'Tüm temeller']]), B('SUYALITIM', 'Su yalıtımı', 'tank', [['SUYALITIM', 'Tıklanan oda / havuz'], ['SUYALITIM T', 'Tüm havuzlar']]), B('SUTUTUCUBANT', 'Su tutucu bant', 'pipe', [['SUTUTUCUBANT MOD=OTO', 'Otomatik (tüm derzler)'], ['SUTUTUCUBANT MOD=EL', 'Elle çiz']])]],
      ['Aks', [B('AKS', 'Aks sistemi', 'grid')]],
      ['Metraj', [B('MATCHPROP', 'Özellik eşleştir', 'prop'), B('INSMETRAJ', 'Metraj', 'table'), B('INSCAKISMA', 'Çakışma / minha', 'table'), B('INSKATMAN', 'Katmanları düzenle', 'layer')]],
    ]],
    ['Arıtma', [
      ['Yapılar', [B('POMPAISTASYONU', 'Pompa ist.', 'station'), B('SU', 'Su doldur', 'water'), B('HAVUZ', 'Havuz', 'tank'), B('DHAVUZ', 'D. havuz', 'ctank'), s('DUVAR', 'Duvar', 'wall')]],
      ['Boru ve ekipman', [B('BORU', 'Boru', 'pipe'), s('POMPA', 'Pompa', 'pump'), s('KABAIZGARA', 'Kaba ızgara', 'box'), s('VB', 'Hatta vana', 'valve'), s('KUTUPHANE', 'Kütüphane', 'valve'), s('MODELKUTUPHANESI', '3B modeller', 'box'), s('BOM HEPSI', 'BOM', 'table')]],
      ['Arazi', [B('ARAZI', 'Arazi al', 'earth'), s('ARAZIKOT', 'Arazi kotu', 'kot'), s('ARAZIAYAR', 'Saydamlık', 'earth')]],
      ['Kazı', [B('KAZI', 'Kazı', 'exc'), s('KAZIDURUM', 'Geri dolgu', 'exc'), s('KAZIKESIT', 'Kazı kesiti', 'cut'), s('KAZIHACIM', 'Kübaj', 'table')]],
    ]],
    ['3B Modelleme', [
      ['Gezin', [B('@v3sel', 'Seç', 'sel'), B('@v3orbit', 'Yörünge', 'orbit'), B('@v3pan', 'Kaydır', 'pan')]],
      ['Çiz', [s('LINE', 'Çizgi', 'line'), s('XLINE', 'Yardımcı çizgi', 'line', [['XLINE X', 'Yatay X'], ['XLINE Y', 'Yatay Y'], ['XLINE Z', 'Düşey Z'], ['XLINE A', 'Açılı'], ['XLINE O', 'Ofset'], ['XLINE', 'İki nokta']]), s('PLINE', 'Çoklu', 'pline'), s('RECTANG', 'Dikdörtgen', 'rec'), s('CIRCLE', 'Daire', 'circle'), s('ELLIPSE', 'Elips', 'ellipse'), s('KUTU', 'Kutu', 'box')]],
      ['Modelle', [B('PUSHPULL', 'İt / Çek', 'pp'), s('ELEMANYAP TIP=PERDE', 'Çizgiden perde', 'wall'), s('PERDEPARCA', 'Perde parçası', 'pp'), s('PERDEBOL', 'Perdeyi böl', 'trim'), B('EXTRUDE', 'Ekstrüzyon', 'ext3'), s('OFFSET', 'Ötele (yüz)', 'offset'), s('ESNET', 'Esnet', 'scale'), s('SWEEP', 'Süpür', 'sweep'), s('TAPER', 'Konik', 'taper'), s('FILLET', 'Yuvarla', 'fillet'), s('CHAMFER', 'Pah', 'pah'), s('YUZYAP', 'Yüz yap', 'face'), s('ELEMANYAP', 'Çizgiden eleman', 'ext3'), s('MALZEME', 'Malzeme dokusu', 'brush')]],
      ['Katı', [B('UNION', 'Birleştir', 'uni'), B('SEPARATE', 'Ayır', 'sep')]],
      ['Düzenle', [s('MOVE', 'Taşı', 'move'), s('COPY', 'Kopyala', 'copy'), s('ROTATE', 'Döndür', 'rot'), s('SCALE', 'Ölçekle', 'scale'), s('ARRAY', 'Dizi', 'array'), s('ERASE', 'Sil', 'erase'), s('MATCHPROP', 'Özellik eşleştir', 'prop')]],
      ['Kesit', [B('KESITDUZLEMI', 'Kesit düzlemi', 'plane', [['KESITDUZLEMI N', 'Çizgiye dik'], ['KESITDUZLEMI D', 'İki nokta'], ['KESITDUZLEMI Y', 'Yatay (kot)'], ['KESITDUZLEMI K', 'Kesmeyi kapat'], ['KDKESIT', '2B kesit / plan üret']]), B('KESITAL', 'Kesit al', 'cut'), s('KOTPLANI', 'Kot planı', 'area'), s('GORUNUS', 'Görünüş', 'box'), s('GORUNUSGUNCELLE', 'Güncelle', 'undo'), s('KESITAYAR', 'Kesit stili', 'prop')]],
      ['Dışa aktar', [B('HTML3B', '3B HTML', 'box'), s('OBJOUT', 'OBJ', 'box'), s('KMZOUT', 'KMZ', 'earth')]],
    ]],
    ['Pafta', [
      ['Düzen', [B('DUZEN YENI', 'Yeni düzen', 'sheet'), B('MVIEW M', 'Pencere ekle', 'rec', [['MVIEW M', 'Modelden alan seç'], ['MVIEW', 'Dikdörtgen çiz'], ['MVIEW C', 'Daire'], ['MVIEW P', 'Çokgen']]), s('@vpFrameDlg', 'Çerçeve', 'rec'), s('DETAY', 'Detay', 'detay'), s('VPYER', 'Yerini seç', 'move'), s('PAFTALA', 'Paftala', 'array'), s('SAYFADUZENI', 'Sayfa düzeni', 'prop')]],
      ['Antet', [B('ANTET YUKLE', 'Antet yükle', 'sheet'), s('ANTET SABITLE', 'Varsayılan yap', 'sheet'), s('PAFTA', 'Model paftası', 'sheet')]],
      ['Yazdır', [B('DUZENYAZDIR', 'Yazdır / PDF', 'print'), s('TUMUNUYAZDIR', 'Tümünü yazdır', 'print'), s('GORUNUSPAFTA', 'Görünüşü paftala', 'sheet')]],
      ['AutoCAD', [B('DISIPLINDXF', 'Disiplin DXF dosyaları (her biri ayrı)', 'sheet'), s('BOLGEDUZENLE', 'Bölgeleri düzenle', 'array')]],
    ]],
    ['Görünüm', [
      ['Gezinme', [B('ZOOM E', 'Tümü', 'zoomE'), s('ZOOM', 'Yakınlaştır', 'zoom'), s('PLAN3B', '3B model planda', 'box')]],
      ['Yardımcılar', [B('IZGARAAYAR', 'Snap / ızgara', 'grid'), s('OSNAP', 'Yakalama', 'snap'), s('PANEL', 'Yan panel', 'side')]],
      ['Arayüz', [B('ELEMANLAR', 'Eleman tarayıcısı', 'menu'), B('@ribbonTools', 'Sol araç çubuğu', 'menu'), B('@ribbonMenus', 'Klasik menüler', 'menu')]],
    ]],
    ['Hesap', [
      ['Proses', [B('ATV131', 'ATV-A 131', 'calc'), B('BLOWER', 'Blower', 'calc'), B('POMPAHESAP', 'Pompa', 'pump'), B('MIKSER', 'Mikser', 'rot')]],
      ['Hızlı', [s('HAZNEHESAP', 'Islak hazne', 'calc'), s('BORUHESAP', 'Boru hızı', 'calc')]],
    ]],
  ];

  const css = `
#app.ribbon{grid-template-columns:0 1fr 370px;grid-template-rows:44px auto 1fr auto;grid-template-areas:"top top top" "rib rib rib" "tools views side" "bottom bottom side"}
#app.ribbon.noside,#app.ribbon.sideauto{grid-template-columns:0 1fr 0}
#app.ribbon.withtools{grid-template-columns:76px 1fr 370px}#app.ribbon.withtools.noside,#app.ribbon.withtools.sideauto{grid-template-columns:76px 1fr 0}
#app.ribbon:not(.withtools) #tools{display:none}
#app.ribbon:not(.classicmenus) nav.menus .menu:not(.keep){display:none}
#ribbon{grid-area:rib;background:var(--panel);border-bottom:1px solid var(--line);min-width:0;user-select:none}
#ribbon .rtabs{display:flex;gap:2px;padding:3px 8px 0;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
#ribbon .rtabs button{background:none;border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;padding:4px 12px;font-size:12.5px;color:var(--mut);white-space:nowrap}
#ribbon .rtabs button.on{background:var(--panel2);color:var(--txt,#e6e9ee);border-color:var(--line);border-bottom-color:var(--panel2);margin-bottom:-1px}
#ribbon .rtabs .rmin{margin-left:auto;color:var(--mut)}
#ribbon .rbody{display:flex;gap:0;padding:4px 6px;background:var(--panel2);overflow-x:auto;scrollbar-width:thin;min-height:84px}
#ribbon.min .rbody{display:none}
#ribbon .rp{display:flex;flex-direction:column;border-right:1px solid var(--line);padding:0 6px;flex:none}
#ribbon .rp .rb{display:flex;gap:2px;align-items:flex-start;flex:1}
#ribbon .rp .rs{display:grid;grid-template-rows:repeat(3,22px);grid-auto-flow:column;gap:1px 2px}
#ribbon .rp .rt{font-size:10.5px;color:var(--mut);text-align:center;padding:2px 0 0;cursor:default;white-space:nowrap}
#ribbon .rp .rt.more{cursor:pointer}#ribbon .rp .rt.more:hover{color:#fff}
#ribbon .big{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;width:58px;min-height:66px;padding:3px 2px;background:none;border:1px solid transparent;border-radius:5px;font-size:11px;line-height:1.1;text-align:center;position:relative}
#ribbon .big svg{width:28px;height:28px;stroke:currentColor;fill:none;stroke-width:1.5}
#ribbon .big .dd{font-size:9px;opacity:.75;margin-top:auto}
#ribbon .sm{display:flex;align-items:center;gap:5px;height:22px;padding:0 6px 0 3px;background:none;border:1px solid transparent;border-radius:4px;font-size:11.5px;white-space:nowrap}
#ribbon .sm svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.6;flex:none}
#ribbon .big:hover,#ribbon .sm:hover{background:var(--panel);border-color:var(--line)}
#ribbon .big.on,#ribbon .sm.on{background:#1f3550;border-color:#4aa3ff}
.rdrop{position:fixed;z-index:80;background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;min-width:190px}
.rdrop button{text-align:left;background:none;border:1px solid transparent;padding:5px 10px;font-size:12.5px}.rdrop button:hover{background:var(--panel2)}
#app.ribbon #v3tools{display:none!important}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const app = $('#app'), rib = document.createElement('div'); rib.id = 'ribbon';
  const top = $('#top'); top.insertAdjacentElement('afterend', rib);
  // Dosya ve Yardım menüleri her zaman kalır (uygulama menüsü gibi)
  document.querySelectorAll('nav.menus .menu').forEach(m => { const t = (m.querySelector(':scope > button') || {}).textContent || ''; if (/^(Dosya|Yardım)$/.test(t.trim())) m.classList.add('keep'); });
  const pref = (k, d) => { try { const v = localStorage.getItem('aritmacad.rib.' + k); return v == null ? d : v === '1'; } catch (e) { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem('aritmacad.rib.' + k, v ? '1' : '0'); } catch (e) { } };
  app.classList.add('ribbon'); app.classList.toggle('withtools', pref('tools', false)); app.classList.toggle('classicmenus', pref('menus', false));
  if (pref('min', false)) rib.classList.add('min');

  let drop = null; const closeDrop = () => { if (drop) { drop.remove(); drop = null; } };
  document.addEventListener('pointerdown', e => { if (drop && !drop.contains(e.target)) closeDrop(); }, true);
  const showDrop = (el, items) => { closeDrop(); const r = el.getBoundingClientRect(); drop = document.createElement('div'); drop.className = 'rdrop'; for (const [c, t] of items) { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { closeDrop(); run(c); }; drop.appendChild(b); } document.body.appendChild(drop); drop.style.left = Math.min(r.left, innerWidth - 220) + 'px'; drop.style.top = (r.bottom + 2) + 'px'; };
  const run = cmd => {
    if (cmd === '@ribbonTools') { const v = !app.classList.contains('withtools'); app.classList.toggle('withtools', v); setPref('tools', v); C.log(v ? 'Sol araç çubuğu açık.' : 'Sol araç çubuğu kapalı (komutlar şeritte).'); return; }
    if (cmd === '@ribbonMenus') { const v = !app.classList.contains('classicmenus'); app.classList.toggle('classicmenus', v); setPref('menus', v); C.log(v ? 'Klasik açılır menüler gösteriliyor.' : 'Klasik menüler gizlendi (Dosya ve Yardım kalır).'); return; }
    if (cmd === '@vpFrameDlg') { if (C.currentView !== 'layout') C.setView('layout'); C.vpFrameDialog && C.vpFrameDialog(C.layoutSel); return; }
    if (cmd[0] === '@') { const el = document.getElementById(cmd.slice(1)); if (el) el.click(); setTimeout(mark, 0); return; }
    C.runTool(cmd);
  };
  let curTab = 0;
  const render = () => {
    const tabs = TABS.map((t, i) => `<button data-t="${i}" class="${i === curTab ? 'on' : ''}">${t[0]}</button>`).join('') + `<button class="rmin" title="Şeridi küçült / aç (sekmeye çift tık)">${rib.classList.contains('min') ? '▾' : '▴'}</button>`;
    const body = TABS[curTab][1].map(([title, items, more], pi) => {
      const bigs = items.filter(x => x.big), sms = items.filter(x => !x.big);
      const bh = bigs.map(x => `<button class="big" data-c="${x.cmd}" ${x.opts ? `data-o="${pi}:${items.indexOf(x)}"` : ''} title="${x.t} (${x.cmd})">${ic(x.i)}<span>${x.t}</span>${x.opts ? '<span class="dd">▾</span>' : ''}</button>`).join('');
      const sh = sms.length ? `<div class="rs">${sms.map(x => `<button class="sm" data-c="${x.cmd}" title="${x.t} (${x.cmd})">${ic(x.i)}<span>${x.t}</span></button>`).join('')}</div>` : '';
      return `<div class="rp"><div class="rb">${bh}${sh}</div><div class="rt ${more ? 'more' : ''}" data-p="${pi}">${title}${more ? ' ▾' : ''}</div></div>`;
    }).join('');
    rib.innerHTML = `<div class="rtabs">${tabs}</div><div class="rbody">${body}</div>`;
    rib.querySelectorAll('.rtabs [data-t]').forEach(b => { b.onclick = () => { if (+b.dataset.t === curTab && rib.classList.contains('min')) { rib.classList.remove('min'); setPref('min', false); } curTab = +b.dataset.t; render(); }; b.ondblclick = () => { rib.classList.toggle('min'); setPref('min', rib.classList.contains('min')); render(); }; });
    rib.querySelector('.rmin').onclick = () => { rib.classList.toggle('min'); setPref('min', rib.classList.contains('min')); render(); };
    rib.querySelectorAll('[data-c]').forEach(b => {
      b.onclick = ev => {
        if (b.dataset.o) { const r = b.getBoundingClientRect(); const [pi, ii] = b.dataset.o.split(':').map(Number), it = TABS[curTab][1][pi][1][ii]; if (ev.target.closest('.dd') || ev.clientY > r.bottom - 16) { showDrop(b, it.opts); return; } }
        run(b.dataset.c);
      };
      if (b.dataset.o) b.oncontextmenu = ev => { ev.preventDefault(); const [pi, ii] = b.dataset.o.split(':').map(Number); showDrop(b, TABS[curTab][1][pi][1][ii].opts); };
    });
    rib.querySelectorAll('.rt.more').forEach(t => t.onclick = () => showDrop(t, TABS[curTab][1][+t.dataset.p][2]));
    mark();
  };
  const mark = () => { const n = C.cmd.running && C.cmd.running.names[0]; rib.querySelectorAll('[data-c]').forEach(b => { const c = b.dataset.c.split(' ')[0]; b.classList.toggle('on', !!n && !!C.cmds[c] && C.cmds[c].names[0] === n); }); for (const id of ['v3orbit', 'v3pan']) { const o = rib.querySelector(`[data-c="@${id}"]`), src = $('#' + id); if (o && src) o.classList.toggle('on', src.classList.contains('on')); } };
  C.on('cmdstart', () => setTimeout(mark, 0)); C.on('cmdend', () => setTimeout(mark, 0));
  // 3B'ye geçince 3B Modelleme sekmesi, geri dönünce Giriş
  const i3d = TABS.findIndex(t => t[0] === '3B Modelleme'), sv = C.setView; let prevTab = 0;
  C.setView = function (v) { const r = sv.apply(this, arguments); if (v === '3d' && curTab !== i3d) { prevTab = curTab; curTab = i3d; render(); } else if (v !== '3d' && curTab === i3d) { curTab = prevTab === i3d ? 0 : prevTab; render(); } return r; };
  render();
  C.ribbon = { render, tabs: TABS, select: name => { const i = TABS.findIndex(t => t[0] === name); if (i >= 0) { curTab = i; render(); } } };
})(window.C);

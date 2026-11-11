/* ArıtmaCAD — ÜNİTE KARTI ÇEKİRDEĞİ (uçtan uca tesis tasarımı, 1. parça — docs/tasarim-uctan-uca.md)
   Proses verisinden (C.doc.set.proses) akış zincirindeki ünite kartlarını üretir.
   Kart = parametre tablosu. Her parametrenin kaynağı: hesap | standart | katalog | elle | türetilen.
   Kademe: ızgara, terfi ve kum tutucu NİHAİ kademe debisiyle; havuzlar ve çökeltme MEVCUT (etkin) kademeyle boyutlanır.
   İlk tam kart ızgara yapısıdır (kaba / ince ayrı yapıda ya da aynı kanalda). Diğer üniteler şimdilik "taslak": yalnız ayak izi.
   Izgara kot zinciri: konteyner zeminde → konveyör bandı konteynerin üstünde → ızgara deşarj ağzı bandın üstünde
   → platform = deşarj ağzı − ızgaranın platformdan boşaltma yüksekliği; ama platform en az taban + su derinliği + hava payı
   ve en az zemin + 0,65 m. Konteynerlerin altında süzüntü suyu kanalı vardır (ayak izine girer). Çokal AAT T-101 ile doğrulandı.
   Saf hesap kısmı tarayıcısız da çalışır (node test/unite-kart.test.js); pencere ve komut yalnız tarayıcıda kurulur.
   Proje ayarları: C.doc.set.uniteKart = { sec:{ onaritma:'A'|'B', debimetre:'MAN'|'PAR', cikis:'DEZ'|'GK', nihai, mevcut }, par:{ kartId:{ k:v } } } */
(function (C) {
  'use strict';
  const K = {};
  const r3 = v => Math.round(v * 1000) / 1000;
  const kopya = o => JSON.parse(JSON.stringify(o || {}));

  /* ---------- firma standartları (docs/tasarim-standartlari.md) — proje bazında değiştirilebilir ---------- */
  K.STD_IZGARA = {
    hp: { ad: 'Hava payı (su yüzü → platform)', v: 1.0, birim: 'm' },
    pz: { ad: 'Platform — zeminden en az yükseklik', v: 0.65, birim: 'm' },
    tw: { ad: 'Dış duvar kalınlığı', v: 0.30, birim: 'm' },
    ti: { ad: 'Kanallar arası bölme kalınlığı', v: 0.0, birim: 'm' },
    bs: { ad: 'Süzüntü suyu kanalı genişliği (konteyner altı, 0 = yok)', v: 0.60, birim: 'm' },
    tb: { ad: 'Taban plağı kalınlığı', v: 0.40, birim: 'm' },
    Hk: { ad: 'Çöp konteyneri yüksekliği (1100 L belediye tipi, EN 840)', v: 1.37, birim: 'm' },
    pk: { ad: 'Konveyör bandı → konteyner üstü payı', v: 0.30, birim: 'm' },
    pd: { ad: 'Izgara deşarj ağzı → konveyör bandı düşüsü', v: 0.15, birim: 'm' },
  };
  K.STD_ARA = { ad: 'Aynı kanalda kaba – ince ızgara arası (açık soru)', v: 3.0, birim: 'm' };
  /* ekipman kataloğu varsayılanları. Deşarj ağzı: halatlı tip ızgara, Çokal AAT T-101 çiziminden ≈1,0 m (firma kararı).
     Açı ve kafa üstü: mekanik kaba ızgara ailesinin ilk tipi (aile-mekanik.js, üretici çizimi 02-FF-010102010301) */
  K.KAT_IZGARA = {
    hBos: { ad: 'Izgara deşarj ağzı — platformdan', v: 1.0, birim: 'm', not: 'Halatlı tip ızgara (Çokal AAT çiziminden)' },
    ust: { ad: 'Tahrik kafası üstü — platformdan', v: 1.545, birim: 'm' },
    a: { ad: 'Izgara eğim açısı (yataydan)', v: 75, birim: '°' },
  };
  /* tarayıcıda: katalog değerleri aile tipinden okunur (tip değişirse kart da değişir) */
  const katalog = () => {
    const o = kopya(K.KAT_IZGARA);
    try {
      const t = C && C.aileTipleri && C.aileTipleri('kaba_izgara')[0];
      if (t && t.p) { if (t.p.ust != null) o.ust.v = t.p.ust / 1000; if (t.p.a != null) o.a.v = +t.p.a; o.tip = t.ad; } // deşarj ağzı aileden alınmaz (zincirli tip, 0,215 m)
    } catch (e) { }
    return o;
  };

  /* ---------- kademeler ---------- */
  K.kademeler = j => (j && Array.isArray(j.kademeler) && j.kademeler.length)
    ? j.kademeler
    : [{ ad: (j && j.kademe) || 'Tek kademe', debi: (j && j.debi) || {}, units: (j && j.units) || {} }];
  const qOf = k => +(((k || {}).debi || {}).Qww || ((k || {}).debi || {}).Qd || 0);
  K.kademeSec = (j, sec) => {
    const L = K.kademeler(j), uy = [];
    const ok = i => i != null && i !== '' && L[+i];
    const iN = ok(sec && sec.nihai) ? +sec.nihai : L.reduce((b, k, i) => (qOf(k) > qOf(L[b]) ? i : b), 0);
    const iM = ok(sec && sec.mevcut) ? +sec.mevcut : (ok(j && j.aktifKademe) ? +j.aktifKademe : 0);
    if (L.length < 2) uy.push('Proses verisinde tek kademe var: ön arıtma ve havuzlar aynı debiyle boyutlandı. ATV penceresinde iki kademe tanımlayıp yeniden aktarın.');
    else if (iN === iM) uy.push('Nihai ve mevcut kademe aynı seçili.');
    if (qOf(L[iN]) < qOf(L[iM])) uy.push('Nihai kademe debisi mevcut kademeden küçük; seçimi kontrol edin.');
    return { liste: L, nihai: L[iN], mevcut: L[iM], iN, iM, uyari: uy };
  };

  /* ---------- ünite listesi ---------- */
  K.UNITE = {
    cs: { ad: 'Kaba ızgara yapısı', tip: 'izgara' }, ps: { ad: 'Giriş terfi istasyonu', tip: 'terfi' }, fs: { ad: 'İnce ızgara yapısı', tip: 'izgara' },
    izB: { ad: 'Kaba ve ince ızgara yapısı (aynı kanal)', tip: 'izgara' },
    gr: { ad: 'Kum ve yağ tutucu', tip: 'kum' }, dm: { ad: 'Debimetre', tip: 'debimetre' }, pc: { ad: 'Ön çökeltme' },
    dg1: { ad: 'Dağıtma yapısı (biyolojik havuzlar)' }, an: { ad: 'Anaerobik havuz', tip: 'anaerobik' }, bio: { ad: 'Biyolojik havuz', tip: 'bio' },
    dg2: { ad: 'Dağıtma yapısı (son çökeltme)' }, sc: { ad: 'Son çökeltme', tip: 'sc' },
    uv: { ad: 'Dezenfeksiyon ve çıkış yapısı' }, cik: { ad: 'Çıkış yapısı' }, gk: { ad: 'Geri kazanım üniteleri' },
    pt: { ad: 'Çamur yoğunlaştırma' }, et: { ad: 'Çamur depolama / stabilizasyon' }, dw: { ad: 'Çamur susuzlaştırma (dekantör binası)' },
    cp: { ad: 'Kimyasal fosfor giderimi' },
  };
  /* nihai kademe debisiyle boyutlanan üniteler (ön arıtma). Terfi istasyonu yapısı da nihai kademeye göre (varsayım) */
  K.NIHAI = new Set(['cs', 'fs', 'izB', 'ps', 'gr', 'dm']);
  const KOKU = new Set(['cs', 'fs', 'izB', 'gr', 'dw', 'et']);

  /* akış zinciri: proses seçimlerine göre ünite sırası. Durum: kart | taslak (proses ebatlı ayak izi) | eksik (hesapta yok) | bekliyor (şablon yok) */
  K.zincir = (j, sec) => {
    sec = sec || {};
    const kd = K.kademeSec(j, sec), uN = kd.nihai.units || {}, uM = kd.mevcut.units || {};
    const veri = id => (K.NIHAI.has(id) ? uN : uM)[id] || null;
    const N = id => { const d = (veri(id) || {}).dim || {}; return Math.max(1, Math.round(+d.N || 1)); };
    const su = [], camur = [], yard = [], uyari = kd.uyari.slice();
    const ekle = (dizi, id, o) => { const t = K.UNITE[id]; dizi.push(Object.assign({ id, ad: t.ad, tip: t.tip || 'taslak', kademe: K.NIHAI.has(id) ? 'nihai' : 'mevcut', koku: KOKU.has(id) }, o)); };
    const durum = id => (veri(id) ? (K.UNITE[id].tip ? 'kart' : 'taslak') : 'eksik');
    const zorunlu = (dizi, id) => { ekle(dizi, id, { durum: durum(id) }); if (!veri(id)) uyari.push(`${K.UNITE[id].ad} proses hesabında yok.`); };
    const secimli = (dizi, id) => { if (veri(id)) ekle(dizi, id, { durum: durum(id), secimli: true }); };

    // ön arıtma
    if ((sec.onaritma || 'A') === 'B') {
      const v = veri('cs') || veri('fs');
      ekle(su, 'izB', { durum: v ? 'kart' : 'eksik', kaynak: ['cs', 'fs'].filter(veri) });
      if (!v) uyari.push('Kaba / ince ızgara proses hesabında yok.');
      secimli(su, 'ps');
    } else {
      zorunlu(su, 'cs'); secimli(su, 'ps'); secimli(su, 'fs');
    }
    zorunlu(su, 'gr');
    ekle(su, 'dm', { durum: 'kart', secenek: (sec.debimetre || 'MAN') === 'PAR' ? 'Parshall savağı' : 'Manyetik debimetre' });
    secimli(su, 'pc');
    if (veri('bio') && N('bio') >= 2) ekle(su, 'dg1', { durum: 'bekliyor', hat: N('bio') });
    secimli(su, 'an');
    zorunlu(su, 'bio');
    if (veri('sc') && N('sc') >= 2) ekle(su, 'dg2', { durum: 'bekliyor', hat: N('sc') });
    zorunlu(su, 'sc');
    if ((sec.cikis || 'DEZ') === 'GK') ekle(su, 'gk', { durum: 'bekliyor' });
    else if (veri('uv')) ekle(su, 'uv', { durum: 'taslak' });
    else ekle(su, 'cik', { durum: 'bekliyor' });
    // çamur hattı ve yardımcılar
    for (const id of ['pt', 'et', 'dw']) secimli(camur, id);
    secimli(yard, 'cp');

    // numara: firma standardı — ünite eklenip çıkarıldıkça yeniden numaralanır
    let no = 101;
    for (const x of [...su, ...camur, ...yard]) x.kod = 'T-' + no++;
    for (const d of [su, camur]) d.forEach((x, i) => { x.sonraki = d[i + 1] ? d[i + 1].kod : null; });
    if (su.length && camur.length) camur[camur.length - 1].sonraki = null; // süzüntü suyu: biyolojik havuzun başına (saha borulamasında)
    return { kademe: kd, su, camur, yard, uyari };
  };

  /* ---------- IZGARA YAPISI KARTI ---------- */
  /* dims: [{ rol:'kaba'|'ince', dim:{ N, Nsb, b, h, H, L, th, e } }], par: proje değişiklikleri { k: v } */
  K.izgaraKart = (id, dims, par, katV) => {
    par = par || {};
    const kat = katV || kopya(K.KAT_IZGARA), P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    // proje değişikliği varsa onu kullan (kaynak aynı kalır, "değişti" işaretlenir)
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };

    // hesaptan (B seçeneğinde iki ekipman tek kanalda: büyük olan ölçü)
    const d = dims.map(x => x.dim || {}), mx = k => Math.max(...d.map(x => +x[k] || 0));
    const rol = dims.map(x => (x.rol === 'kaba' ? 'kaba' : 'ince')).join(' + ');
    const N = ek('N', 'Çalışan kanal sayısı', Math.max(1, Math.round(mx('N'))), 'adet', 'hesap');
    const Nsb = ek('Nsb', 'Yedek (baypas) kanal sayısı', Math.round(mx('Nsb')), 'adet', 'hesap');
    const b = ek('b', 'Kanal genişliği', mx('b'), 'm', 'hesap');
    const h = ek('h', 'Su derinliği (Q maks.)', mx('h'), 'm', 'hesap');
    const Lk = dims.map(x => +(x.dim || {}).L || 0);
    dims.forEach((x, i) => {
      const r = x.rol === 'kaba' ? 'kaba' : 'ince';
      if (x.dim.e != null) ek('e_' + r, `Çubuk aralığı (${r})`, +x.dim.e, 'mm', 'hesap');
    });
    if (mx('H')) ek('H_atv', 'Kanal yüksekliği — ATV hesabı (bilgi)', mx('H'), 'm', 'hesap', { not: 'ATV: su derinliği + yük kaybı + hava payı. Kartta firma standardı kullanılır.' });
    // standart
    const S = {}; for (const [k, s] of Object.entries(K.STD_IZGARA)) S[k] = dz(k, s.ad, s.v, s.birim, 'standart');
    const ara = dims.length > 1 ? dz('ara', K.STD_ARA.ad, K.STD_ARA.v, K.STD_ARA.birim, 'standart') : 0;
    const L = ek('L', 'Kanal uzunluğu', dims.length > 1 ? Math.max(...Lk) + ara : Lk[0], 'm', dims.length > 1 ? 'türetilen' : 'hesap', dims.length > 1 ? { f: 'en uzun kanal + kaba–ince arası' } : {});
    // katalog
    const a = dz('a', kat.a.ad, kat.a.v, kat.a.birim, 'katalog');
    for (const x of dims) if (x.dim.th != null && Math.abs(+x.dim.th - a) > 0.5) uyari.push(`ATV hesabında ${x.rol} ızgara açısı ${x.dim.th}°, katalogda ${a}°. Yük kaybı hesabını kontrol edin.`);
    const hBos = dz('hBos', kat.hBos.ad, kat.hBos.v, 'm', 'katalog', kat.hBos.not || null);
    const ust = dz('ust', kat.ust.ad, kat.ust.v, 'm', 'katalog', kat.tip ? 'Aile tipi: ' + kat.tip : null);
    // elle (sonraki parçalarda otomatik gelecek)
    const zt = dz('zt', 'Kanal taban kotu', 0, 'm', 'elle', '3. parçada hidrolik profilden gelecek');
    const zzVars = zt + h + S.hp - S.pz; // zemin bilinmiyorsa: platform tam su yüzü + hava payında kalır
    const zzV = par.zz != null && par.zz !== '' && isFinite(+par.zz) ? +par.zz : zzVars;
    const zz = ek('zz', 'Zemin kotu (konteyner yeri)', zzV, 'm', 'elle', { duz: true, deg: par.zz != null && par.zz !== '', vars: r3(zzVars), not: 'Boşsa platform = su yüzü + hava payı alınır. 2. parçada araziden okunacak' });

    // türetilen — platform üç koşulun en büyüğü: su yüzü + hava payı, zemin + platform payı, konteyner ve konveyörün sığması
    const n = ek('n', 'Toplam kanal (çalışan + yedek)', N + Nsb, 'adet', 'türetilen', { f: 'N + Nsb' });
    const Dmin = h + S.hp;
    const adaylar = [[zt + Dmin, 'su yüzü + hava payı'], [zz + S.pz, 'zemin + platform payı'], [zz + S.Hk + S.pk + S.pd - hBos, 'konteyner ve konveyör yüksekliği']];
    const [zpV, neden] = adaylar.reduce((a, b) => (b[0] > a[0] + 1e-9 ? b : a));
    const zp = ek('zp', 'Yürüme platformu kotu', zpV, 'm', 'türetilen', { f: 'en büyük(taban + h + hava payı ; zemin + platform payı ; zemin + konteyner + pay + düşü − deşarj yük.)', not: 'Belirleyen: ' + neden });
    const D = ek('D', 'Kanal derinliği (taban → platform)', zp - zt, 'm', 'türetilen', { f: 'platform − taban' });
    const zd = ek('zd', 'Izgara deşarj ağzı kotu', zp + hBos, 'm', 'türetilen', { f: 'platform + deşarj yüksekliği' });
    const zb = ek('zb', 'Konveyör bandı kotu', zd - S.pd, 'm', 'türetilen', { f: 'deşarj ağzı − düşü' });
    ek('zk', 'Konteyner üstü kotu', zz + S.Hk, 'm', 'türetilen', { f: 'zemin + konteyner' });
    ek('Ht', 'Izgara toplam yüksekliği (tabandan)', D + ust, 'm', 'türetilen', { f: 'kanal derinliği + kafa üstü' });
    ek('Le', 'Izgara eğim boyu', (D + ust) / Math.sin(a * Math.PI / 180), 'm', 'türetilen', { f: 'toplam yükseklik / sin(açı)' });
    const zs = ek('zs', 'Su yüzü kotu (Q maks.)', zt + h, 'm', 'türetilen', { f: 'taban + h' });
    const zf = ek('zf', 'Temel alt kotu', zt - S.tb, 'm', 'türetilen', { f: 'taban − taban plağı' });
    const nb = n + (S.bs > 0 ? 1 : 0); // süzüntü kanalı da bir göz
    const en = ek('en', 'Ayak izi eni', n * b + S.bs + (nb - 1) * S.ti + 2 * S.tw, 'm', 'türetilen', { f: 'n·b + süzüntü kanalı + bölmeler + 2·dış duvar' });
    const boy = ek('boy', 'Ayak izi boyu', L, 'm', 'türetilen', { f: 'kanal uzunluğu' });

    if (Nsb < 1) uyari.push('Yedek kanal yok: firma standardına göre baypas (yedek) kanal zorunlu. ATV hesabında yedek kanal sayısını 1 yapın.');
    if (zp > zt + Dmin + 0.005) uyari.push(`Platformu ${neden} belirliyor: su yüzü + hava payının ${(zp - zt - Dmin).toFixed(2).replace('.', ',')} m üstünde. Kanal derinleşti.`);
    if (zb < zz + S.Hk + S.pk - 0.005) uyari.push('Konveyör bandı konteynerin üstünde kalmıyor.');
    if (dims.length > 1) uyari.push('Kaba ve ince ızgara arası mesafe henüz netleşmedi (açık soru); standart değer kullanıldı.');

    return {
      id, tip: 'izgara', rol, params: P, uyari, koku: true,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: 0, y: r3(en / 2), z: zs }, cikis: { x: r3(boy), y: r3(en / 2), z: zs }, // yerel: x akış yönü, köken dış sol-alt köşe
      kot: { taban: zt, su: zs, platform: zp, desarj: zd, bant: zb, zemin: zz, temel: zf },
    };
  };

  /* ---------- KUM VE YAĞ TUTUCU KARTI (havalandırmalı, gezer köprülü) ----------
     Standartlar Çokal AAT T-103 çiziminden alındı (F-F enine kesit, plan):
     göz iç genişliği = kum bölmesi + ayırma (yağ lameli) + yağ bölmesi; gözler arası 30 cm duvar; dış duvar 40 cm;
     boyuna: dağıtma kanalı 1,50 + havuz + çıkış kanalı 1,50 (aralarda duvar); su yüzü + 0,85 = duvar üstü;
     kum oluğu tabandan 0,50 aşağıda; kum oluğu altında taban plağı. */
  K.STD_KUM = {
    hp: { ad: 'Hava payı (su yüzü → duvar üstü)', v: 0.85, birim: 'm' },
    pz: { ad: 'Duvar üstü — zeminden en az yükseklik', v: 0.65, birim: 'm' },
    tw: { ad: 'Dış duvar kalınlığı', v: 0.40, birim: 'm' },
    ti: { ad: 'Gözler arası duvar kalınlığı', v: 0.30, birim: 'm' },
    bD: { ad: 'Dağıtma (giriş) kanalı iç genişliği', v: 1.50, birim: 'm' },
    bC: { ad: 'Çıkış kanalı iç genişliği', v: 1.50, birim: 'm' },
    ho: { ad: 'Kum oluğu derinliği (tabandan)', v: 0.50, birim: 'm' },
    tb: { ad: 'Kum oluğu altı taban plağı kalınlığı', v: 0.64, birim: 'm' },
  };
  K.kumKart = (id, dim, par, sec) => {
    par = par || {}; dim = dim || {}; sec = sec || {};
    const P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };
    // hesaptan (ATV: N hat, b_SF kum bölmesi, b_FF yağ bölmesi, ayırma, h, L)
    const N = ek('N', 'Göz (hat) sayısı', Math.max(1, Math.round(+dim.N || 1)), 'adet', 'hesap');
    const b = ek('b', 'Kum bölmesi genişliği', +dim.b || 0, 'm', 'hesap');
    const bF = ek('bF', 'Yağ bölmesi genişliği', +dim.bF || 0, 'm', 'hesap');
    const ta = ek('ta', 'Kum – yağ ayırma (lamel) kalınlığı', dim.tw != null ? +dim.tw : 0.10, 'm', 'hesap');
    const h = ek('h', 'Su derinliği (su yüzü → taban)', +dim.h || 0, 'm', 'hesap');
    const L = ek('L', 'Havuz uzunluğu', +dim.L || 0, 'm', 'hesap');
    // standart
    const S = {}; for (const [k, s] of Object.entries(K.STD_KUM)) S[k] = dz(k, s.ad, s.v, s.birim, 'standart');
    // seçenek ve katalog
    const blw = (sec.blowerKum || 'ANA') === 'AYRI';
    ek('blower', 'Kum tutucu blowerları', blw ? 'yanında küçük binada' : 'ana blower binasında', '', 'standart', { not: 'Seçenek: üstteki "Kum tutucu blowerı"' });
    ek('ekip', 'Ekipman', 'gezer köprü, kum pompası, yağ sıyırıcı, kum seperatörü', '', 'katalog', { not: 'Ölçüleri detay şablonunda' });
    // elle
    const zs = dz('zs', 'Su yüzü kotu', 0, 'm', 'elle', '3. parçada hidrolik profilden gelecek');
    const zzVars = zs + S.hp - S.pz;
    const zzO = par.zz != null && par.zz !== '' && isFinite(+par.zz);
    const zz = ek('zz', 'Zemin kotu', zzO ? +par.zz : zzVars, 'm', 'elle', { duz: true, deg: zzO, vars: r3(zzVars), not: 'Boşsa duvar üstü = su yüzü + hava payı alınır. 2. parçada araziden okunacak' });
    // türetilen
    const adaylar = [[zs + S.hp, 'su yüzü + hava payı'], [zz + S.pz, 'zemin + 0,65']];
    const [zuV, neden] = adaylar.reduce((a, c) => (c[0] > a[0] + 1e-9 ? c : a));
    const zu = ek('zu', 'Duvar üstü kotu (köprü yolu)', zuV, 'm', 'türetilen', { f: 'en büyük(su yüzü + hava payı ; zemin + 0,65)', not: 'Belirleyen: ' + neden });
    const zt = ek('zt', 'Taban kotu (kum oluğu üstü)', zs - h, 'm', 'türetilen', { f: 'su yüzü − h' });
    const zo = ek('zo', 'Kum oluğu dibi kotu', zt - S.ho, 'm', 'türetilen', { f: 'taban − kum oluğu derinliği' });
    const zf = ek('zf', 'Temel alt kotu', zo - S.tb, 'm', 'türetilen', { f: 'kum oluğu dibi − taban plağı' });
    const gz = ek('gz', 'Göz iç genişliği', b + ta + bF, 'm', 'türetilen', { f: 'kum + ayırma + yağ bölmesi' });
    const en = ek('en', 'Ayak izi eni', N * gz + (N - 1) * S.ti + 2 * S.tw, 'm', 'türetilen', { f: 'N·göz + (N−1)·ara duvar + 2·dış duvar' });
    const boy = ek('boy', 'Ayak izi boyu', S.bD + L + S.bC + 4 * S.tw, 'm', 'türetilen', { f: 'dağıtma kanalı + havuz + çıkış kanalı + 4·duvar' });
    ek('V', 'Toplam su hacmi (havuzlar)', N * (b + bF) * L * h, 'm³', 'türetilen', { f: 'N · (kum + yağ bölmesi) · L · h (yaklaşık)' });

    if (!b || !h || !L) uyari.push('Kum tutucu ölçüleri proses hesabında eksik (b, h, L).');
    if (zu > zs + S.hp + 0.005) uyari.push(`Duvar üstünü ${neden} belirliyor: su yüzü + hava payının ${(zu - zs - S.hp).toFixed(2).replace('.', ',')} m üstünde.`);
    return {
      id, tip: 'kum', params: P, uyari, koku: true,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: 0, y: r3(en / 2), z: zs }, cikis: { x: r3(boy), y: r3(en / 2), z: zs },
      kot: { su: zs, ust: zu, taban: zt, oluk: zo, temel: zf, zemin: zz },
    };
  };

  /* ---------- GİRİŞ TERFİ İSTASYONU KARTI (ıslak hazne, dalgıç pompa) ----------
     Standartlar Çokal AAT T-102 çiziminden (D-D kesiti, plan):
     hazne iç 3,90 × 2,50 m, duvar 40 cm; 3 pompa aks aralığı 1,00 m, duvara 0,95 m;
     giriş kanalı tabanı 86,75 → 1. pompa devreye girme 85,89 (0,86 m altında) → durma 85,15 → taban 84,80;
     üst döşeme 95,45 = zemin + 0,65; monoray vinç kirişi döşemeden 2,70 m yukarıda.
     Yapı nihai kademeye göre; pompa sayısı mevcut kademede daha az olabilir (aynı yapıya sonradan eklenir). */
  K.STD_TERFI = {
    pg: { ad: 'Giriş kanalı tabanı → en üst çalışma seviyesi payı', v: 0.86, birim: 'm' },
    pz: { ad: 'Üst döşeme — zeminden en az yükseklik', v: 0.65, birim: 'm' },
    tw: { ad: 'Duvar kalınlığı', v: 0.40, birim: 'm' },
    tb: { ad: 'Taban plağı kalınlığı', v: 0.40, birim: 'm' },
    hv: { ad: 'Monoray vinç kirişi — döşemeden', v: 2.70, birim: 'm' },
  };
  K.KAT_TERFI = {
    ap: { ad: 'Pompa aks aralığı', v: 1.00, birim: 'm' },
    ak: { ad: 'Son pompa aksı → duvar', v: 0.95, birim: 'm' },
  };
  K.terfiKart = (id, dim, par, dimM, sec) => {
    par = par || {}; dim = dim || {}; sec = sec || {};
    const ayri = sec.terfiYer === 'AYRI';
    const P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };
    // hesaptan (ATV: nd asil, n bölme başına toplam, nc bölme, L, W, hd ölü, hu faydalı)
    const nc = ek('nc', 'Bölme sayısı', Math.max(1, Math.round(+dim.nc || 1)), 'adet', 'hesap');
    const nP = ek('nP', 'Toplam pompa (asil + yedek, nihai)', Math.max(1, Math.round(+dim.n || 1)) * nc, 'adet', 'hesap');
    const nd = ek('nd', 'Asil pompa (nihai)', Math.round(+dim.nd || 0), 'adet', 'hesap');
    if (dimM) ek('ndM', 'Asil pompa (mevcut kademe)', Math.round(+dimM.nd || 0), 'adet', 'hesap', { not: 'Eksik pompalar nihai kademede aynı yapıya eklenir' });
    const Lh = ek('L', 'Hazne iç boyu (akış yönü)', +dim.L || 0, 'm', 'hesap');
    const W = ek('W', 'Hazne iç genişliği (bölme başına)', +dim.W || 0, 'm', 'hesap');
    const hd = ek('hd', 'Ölü hacim yüksekliği', +dim.hd || 0, 'm', 'hesap');
    const hu = ek('hu', 'Faydalı yükseklik (çalışma aralığı)', +dim.hu || 0, 'm', 'hesap');
    // standart, katalog
    const S = {}; for (const [k, s] of Object.entries(K.STD_TERFI)) S[k] = dz(k, s.ad, s.v, s.birim, 'standart');
    const Kt = {}; for (const [k, s] of Object.entries(K.KAT_TERFI)) Kt[k] = dz(k, s.ad, s.v, s.birim, 'katalog', 'Islak tip dalgıç pompa (Çokal)');
    ek('yer', 'Yerleşim', ayri ? 'ayrı yapı (giriş ve çıkış saha borusuyla)' : 'ön arıtma bloğuna bitişik (aradaki derz 5 cm)', '', 'standart', { not: 'Seçenek: üstteki "Terfi yerleşimi"' });
    // elle
    const zg = dz('zg', ayri ? 'Giriş borusu taban kotu' : 'Giriş kanalı taban kotu', 0, 'm', 'elle', ayri ? 'Gelen borunun haznedeki taban kotu; 3. parçada saha borulamasından' : 'Önceki ünitenin çıkış tabanı; 3. parçada otomatik');
    const zzVars = zg - S.pz;
    const zzO = par.zz != null && par.zz !== '' && isFinite(+par.zz);
    const zz = ek('zz', 'Zemin kotu', zzO ? +par.zz : zzVars, 'm', 'elle', { duz: true, deg: zzO, vars: r3(zzVars), not: 'Boşsa döşeme = giriş tabanı alınır. 2. parçada araziden okunacak' });
    // türetilen kot zinciri
    const z1 = ek('z1', 'En üst çalışma seviyesi (1. pompa devreye girer)', zg - S.pg, 'm', 'türetilen', { f: 'giriş tabanı − pay' });
    const z0 = ek('z0', 'Durma seviyesi (ölü hacim üstü)', z1 - hu, 'm', 'türetilen', { f: 'en üst seviye − faydalı yükseklik' });
    const zt = ek('zt', 'Hazne taban kotu', z0 - hd, 'm', 'türetilen', { f: 'durma − ölü hacim' });
    const zf = ek('zf', 'Temel alt kotu', zt - S.tb, 'm', 'türetilen', { f: 'taban − taban plağı' });
    const zu = ek('zu', 'Üst döşeme kotu', Math.max(zg, zz + S.pz), 'm', 'türetilen', { f: 'en büyük(giriş tabanı ; zemin + 0,65)' });
    ek('D', 'Hazne derinliği (taban → döşeme)', zu - zt, 'm', 'türetilen', { f: 'döşeme − taban' });
    ek('zv', 'Monoray vinç kirişi kotu', zu + S.hv, 'm', 'türetilen', { f: 'döşeme + vinç yüksekliği' });
    const nb = Math.max(1, Math.ceil(nP / nc));
    const Wmin = ek('Wmin', 'Pompa sırası için gereken kenar', (nb - 1) * Kt.ap + 2 * Kt.ak, 'm', 'türetilen', { f: '(bölmedeki pompa − 1)·aks aralığı + 2·duvar mesafesi', not: 'Pompalar haznenin uzun kenarı boyunca dizilir' });
    const en = ek('en', 'Ayak izi eni', nc * W + (nc + 1) * S.tw, 'm', 'türetilen', { f: 'bölme·genişlik + (bölme+1)·duvar' });
    const boy = ek('boy', 'Ayak izi boyu', Lh + 2 * S.tw, 'm', 'türetilen', { f: 'hazne boyu + 2·duvar' });

    const kenar = Math.max(W, Lh);
    if (Wmin > kenar + 0.005) uyari.push(`Hazne (${kenar.toFixed(2).replace('.', ',')} m) ${nb} pompa için dar; katalog aks aralığıyla en az ${Wmin.toFixed(2).replace('.', ',')} m gerekir.`);
    if (!Lh || !W) uyari.push('Terfi haznesi ölçüleri proses hesabında eksik (L, W).');
    return {
      id, tip: 'terfi', params: P, uyari, koku: false, bitisik: !ayri,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: 0, y: r3(en / 2), z: zg }, cikis: { x: r3(boy), y: r3(en / 2), z: null }, // çıkış: basma hattı (saha borulamasında)
      kot: { giris: zg, ust: z1, durma: z0, taban: zt, temel: zf, doseme: zu, zemin: zz },
    };
  };

  /* ---------- DEBİMETRE KARTI ----------
     Manyetik (varsayılan): boru üstünde debimetre odası. Standartlar Çokal AAT T-104 çiziminden:
     oda iç 2,00 (akış yönü) × 1,50 m, duvar 25 cm, taban plağı 30 cm; boru altı tabandan 0,42 m yukarıda;
     üst döşeme 95,45, çevre zemini 95,00. Boru: PE100 (programın boru kataloğu), PN10 / SDR 17, nihai Q maks.'ta hız ≤ 1,5 m/s
     (Çokal: Q maks. 0,083 m³/s → Ø315, DN300 flanş). Düz boru boyları: önce 5·DN, sonra 3·DN (saha borulamasına aktarılır).
     Parshall savağı: boğaz genişliği standart tablodan (Q = K·Ha^n), kot düşümü ≈ 0,4·Ha (yaklaşık; şablonu yok). */
  const PE_OD = [63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630];
  K.PARSHALL = [ // W (m), Q min, Q maks (m³/s), K, n — Q = K·Ha^n
    [0.076, 0.00085, 0.032, 0.177, 1.550], [0.152, 0.0015, 0.111, 0.381, 1.580], [0.229, 0.0025, 0.251, 0.535, 1.530],
    [0.305, 0.0031, 0.457, 0.690, 1.522], [0.457, 0.0042, 0.695, 1.056, 1.538], [0.610, 0.0119, 0.937, 1.428, 1.550],
    [0.914, 0.0173, 1.427, 2.184, 1.566], [1.219, 0.0368, 1.923, 2.953, 1.578], [1.524, 0.0453, 2.424, 3.732, 1.587],
    [1.829, 0.0736, 2.929, 4.519, 1.595], [2.134, 0.0850, 3.438, 5.312, 1.601], [2.438, 0.0991, 3.949, 6.112, 1.607],
  ];
  K.STD_DEBI = {
    vmax: { ad: 'Boruda en büyük hız (Q maks.)', v: 1.5, birim: 'm/s' },
    sdr: { ad: 'PE boru SDR (PN10 = 17)', v: 17, birim: '' },
    Li: { ad: 'Oda iç boyu (akış yönü) — en az', v: 2.00, birim: 'm' },
    Bi: { ad: 'Oda iç genişliği — en az', v: 1.50, birim: 'm' },
    tw: { ad: 'Duvar kalınlığı', v: 0.25, birim: 'm' },
    tb: { ad: 'Taban plağı kalınlığı', v: 0.30, birim: 'm' },
    pa: { ad: 'Boru altı → oda tabanı', v: 0.42, birim: 'm' },
    pz: { ad: 'Üst döşeme — zeminden', v: 0.45, birim: 'm' },
  };
  K.debimetreKart = (id, debiN, debiM, par, sec, katPE) => {
    par = par || {}; sec = sec || {}; debiN = debiN || {}; debiM = debiM || debiN;
    const P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };
    const parshall = (sec.debimetre || 'MAN') === 'PAR';
    // hesaptan: nihai kademe Q maks., mevcut kademe Q min.
    const Qmax = ek('Qmax', 'Q maks. (nihai kademe)', (+debiN.Qww || 0) / 3600, 'm³/s', 'hesap');
    const Qmin = ek('Qmin', 'Q min. (mevcut kademe)', (+debiM.Qmin || 0) / 3600, 'm³/s', 'hesap');
    ek('tip', 'Debimetre tipi', parshall ? 'Parshall savağı' : 'Manyetik debimetre', '', 'standart', { not: 'Seçenek: üstteki "Debimetre"' });
    const S = {}; for (const [k, s] of Object.entries(K.STD_DEBI)) S[k] = dz(k, s.ad, s.v, s.birim, 'standart');
    if (parshall) {
      const r = K.PARSHALL.find(x => x[2] >= Qmax) || K.PARSHALL[K.PARSHALL.length - 1];
      const W = ek('W', 'Boğaz genişliği', r[0], 'm', 'katalog', { not: 'Parshall standart tablosu' });
      const Ha = ek('Ha', 'Savak önü su yüksekliği (Q maks.)', Math.pow(Qmax / r[3], 1 / r[4]), 'm', 'türetilen', { f: '(Q / K)^(1/n)' });
      ek('dz', 'Gerekli kot düşümü (yaklaşık)', 0.4 * Ha, 'm', 'türetilen', { f: '≈ 0,4·Ha (serbest akış)', not: 'Hidrolik profile işlenir' });
      if (Qmax > r[2]) uyari.push(`Q maks. (${Qmax.toFixed(2).replace('.', ',')} m³/s) tablodaki en büyük boğazın kapasitesini (${r[2].toFixed(2).replace('.', ',')} m³/s) aşıyor; birden fazla savak gerekir.`);
      if (Qmin && Qmin < r[1]) uyari.push(`Q min. (${Qmin.toFixed(4).replace('.', ',')} m³/s) seçilen boğazın ölçüm alt sınırının altında.`);
      uyari.push('Parshall savağı şablonu henüz yok; ayak izi çizilmedi.');
      return { id, tip: 'debimetre', params: P, uyari, koku: false, ayakIzi: null, kot: {} };
    }
    // manyetik: katalogdan en küçük uygun PE boru
    const liste = katPE && katPE.length ? katPE : PE_OD;
    const di = od => od * (1 - 2 / S.sdr) / 1000;
    const od = liste.find(o => Qmax / (Math.PI / 4 * di(o) ** 2) <= S.vmax) || liste[liste.length - 1];
    const OD = ek('OD', 'Boru dış çapı (PE100)', od, 'mm', 'türetilen', { f: 'katalogda Q maks.\'ta hız ≤ sınır olan en küçük çap' });
    const A = Math.PI / 4 * di(OD) ** 2;
    const vM = ek('vmaxH', 'Hız (Q maks.)', Qmax / A, 'm/s', 'türetilen', { f: 'Q / iç kesit' });
    const vm = ek('vminH', 'Hız (Q min.)', Qmin / A, 'm/s', 'türetilen', { f: 'Q / iç kesit' });
    const DN = ek('DN', 'Debimetre DN (flanş)', (C && C.flangeDN ? C.flangeDN('PE', OD) : ({ 250: 250, 280: 250, 315: 300, 355: 350, 400: 400 })[OD] || OD), 'mm', 'türetilen', { f: 'PE çapına uyan flanş' });
    ek('Lu', 'Debimetre öncesi düz boru', 5 * DN / 1000, 'm', 'türetilen', { f: '5·DN', not: 'Saha borulamasına aktarılır' });
    ek('Ld', 'Debimetre sonrası düz boru', 3 * DN / 1000, 'm', 'türetilen', { f: '3·DN' });
    // elle
    const zb = dz('zb', 'Boru taban kotu (debimetrede)', 0, 'm', 'elle', 'Önceki ünitenin çıkış borusu; 3. parçada hidrolikten');
    const zzVars = zb + S.pa + 1.5;
    const zzO = par.zz != null && par.zz !== '' && isFinite(+par.zz);
    const zz = ek('zz', 'Zemin kotu', zzO ? +par.zz : zzVars, 'm', 'elle', { duz: true, deg: zzO, vars: r3(zzVars), not: '2. parçada araziden okunacak' });
    // türetilen
    const Li = ek('Lic', 'Oda iç boyu', Math.max(S.Li, 1.0 + DN / 1000 * 1.7), 'm', 'türetilen', { f: 'en büyük(standart ; debimetre boyu + montaj payı)' });
    const Bi = ek('Bic', 'Oda iç genişliği', Math.max(S.Bi, OD / 1000 + 1.1), 'm', 'türetilen', { f: 'en büyük(standart ; boru + 2·0,55)' });
    const zt = ek('zt', 'Oda taban kotu', zb - S.pa, 'm', 'türetilen', { f: 'boru altı − pay' });
    ek('zf', 'Temel alt kotu', zt - S.tb, 'm', 'türetilen', { f: 'taban − taban plağı' });
    const zu = ek('zu', 'Üst döşeme kotu', zz + S.pz, 'm', 'türetilen', { f: 'zemin + pay' });
    ek('D', 'Oda derinliği (taban → döşeme)', zu - zt, 'm', 'türetilen', { f: 'döşeme − taban' });
    const en = ek('en', 'Ayak izi eni', Bi + 2 * S.tw, 'm', 'türetilen', { f: 'iç genişlik + 2·duvar' });
    const boy = ek('boy', 'Ayak izi boyu', Li + 2 * S.tw, 'm', 'türetilen', { f: 'iç boy + 2·duvar' });
    if (vM > S.vmax + 1e-6) uyari.push(`Katalogdaki en büyük boru (Ø${OD}) bile yetmiyor: hız ${vM.toFixed(2).replace('.', ',')} m/s. Birden fazla debimetre hattı ya da Parshall savağı düşünün.`);
    if (vm && vm < 0.3) uyari.push(`Q min.'da hız ${vm.toFixed(2).replace('.', ',')} m/s; manyetik debimetre için düşük (≥ 0,3 m/s önerilir).`);
    if (!Qmax) uyari.push('Proses verisinde debi yok.');
    return {
      id, tip: 'debimetre', params: P, uyari, koku: false,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: 0, y: r3(en / 2), z: zb }, cikis: { x: r3(boy), y: r3(en / 2), z: zb },
      kot: { boru: zb, taban: zt, doseme: zu, zemin: zz },
    };
  };

  /* ---------- ANAEROBİK HAVUZ KARTI (program üretir; docs/tasarim-uctan-uca.md "Üç gözlü anaerobik havuz") ----------
     Gözler dikdörtgen, yan yana, ortak duvarlı, seri akışlı. 1. göz geri devir + süzüntü suyunu, diğerleri ham suyu alır;
     giriş yapısındaki ayırıcı kapak açılınca tüm sular 1. göze karışarak girer. Göz sayısı seçimli (3 / 1).
     Toplam hacim ATV'den; temas süresi = V / (Q ort. + geri devir), geri devir = oran × Q maks. (Çokal raporu yöntemi), 0,5–1,5 sa.
     Standart ölçüler Çokal AAT T-105 çiziminden (carrousel şekli alınmadı): duvar 30 cm, hava payı 0,60 m,
     giriş kanalı 0,80 m, çıkış kanalı 1,00 m, taban plağı 0,50 m. */
  K.STD_AN = {
    hp: { ad: 'Hava payı (su yüzü → duvar üstü)', v: 0.60, birim: 'm' },
    pz: { ad: 'Duvar üstü — zeminden en az yükseklik', v: 0.65, birim: 'm' },
    tw: { ad: 'Dış duvar kalınlığı', v: 0.30, birim: 'm' },
    ti: { ad: 'Gözler arası ortak duvar', v: 0.30, birim: 'm' },
    bG: { ad: 'Giriş (dağıtım) kanalı iç genişliği', v: 0.80, birim: 'm' },
    bC: { ad: 'Çıkış kanalı iç genişliği', v: 1.00, birim: 'm' },
    tb: { ad: 'Taban plağı kalınlığı', v: 0.50, birim: 'm' },
    ras: { ad: 'Geri devir oranı (Q maks.\'a göre)', v: 0.75, birim: '' },
  };
  K.anaerobikKart = (id, dim, debi, par, sec) => {
    par = par || {}; dim = dim || {}; debi = debi || {}; sec = sec || {};
    const P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };
    // hesaptan (ATV: N hat × L × W × h)
    const Nh = Math.max(1, Math.round(+dim.N || 1));
    const L = ek('L', 'Göz boyu (akış yönü)', +dim.L || 0, 'm', 'hesap');
    const h = ek('h', 'Su derinliği', +dim.h || 0, 'm', 'hesap');
    const V = ek('V', 'Toplam hacim', Nh * (+dim.L || 0) * (+dim.W || 0) * (+dim.h || 0), 'm³', 'hesap', { f: 'ATV: hat × L × W × h' });
    const Qo = ek('Qo', 'Ortalama debi (mevcut kademe)', (+debi.Qd || 0) / 24, 'm³/h', 'hesap');
    const Qm = ek('Qm', 'En büyük debi (mevcut kademe)', +debi.Qww || 0, 'm³/h', 'hesap');
    // seçenek ve standart
    const ng = sec.anGoz === '1' ? 1 : 3;
    ek('ng', 'Göz sayısı', ng, 'adet', 'standart', { not: 'Seçenek: üstteki "Anaerobik göz"' });
    const S = {}; for (const [k, s] of Object.entries(K.STD_AN)) S[k] = dz(k, s.ad, s.v, s.birim, 'standart');
    ek('rol', 'Gözlerin görevi', ng === 3 ? '1. göz: geri devir + süzüntü · 2. ve 3. göz: ham su (ayırıcı kapak açıkken hepsi 1. göze)' : 'tek göz: ham su + geri devir + süzüntü', '', 'standart');
    ek('mik', 'Karıştırıcı', 'her gözde; tabanda ≥ 0,3 m/s (mikser programıyla seçilir)', '', 'katalog');
    // elle
    const zs = dz('zs', 'Su yüzü kotu', 0, 'm', 'elle', '3. parçada hidrolik profilden gelecek');
    const zzVars = zs + S.hp - S.pz;
    const zzO = par.zz != null && par.zz !== '' && isFinite(+par.zz);
    const zz = ek('zz', 'Zemin kotu', zzO ? +par.zz : zzVars, 'm', 'elle', { duz: true, deg: zzO, vars: r3(zzVars), not: '2. parçada araziden okunacak' });
    // türetilen
    const bg = ek('bg', 'Göz eni', ng ? Nh * (+dim.W || 0) / ng : 0, 'm', 'türetilen', { f: 'toplam en / göz sayısı (hacim korunur)' });
    ek('Vg', 'Göz hacmi', V / ng, 'm³', 'türetilen', { f: 'toplam hacim / göz sayısı' });
    const QRS = ek('QRS', 'Geri devir debisi', S.ras * Qm, 'm³/h', 'türetilen', { f: 'oran × Q maks.' });
    const t = ek('t', 'Temas süresi', Qo + QRS > 0 ? V / (Qo + QRS) : 0, 'sa', 'türetilen', { f: 'V / (Q ort. + geri devir)', not: 'Süzüntü suyu debisi dahil değil' });
    const adaylar = [[zs + S.hp, 'su yüzü + hava payı'], [zz + S.pz, 'zemin + 0,65']];
    const [zuV, neden] = adaylar.reduce((a, c) => (c[0] > a[0] + 1e-9 ? c : a));
    const zu = ek('zu', 'Duvar üstü kotu', zuV, 'm', 'türetilen', { f: 'en büyük(su yüzü + hava payı ; zemin + 0,65)', not: 'Belirleyen: ' + neden });
    const zt = ek('zt', 'Taban kotu', zs - h, 'm', 'türetilen', { f: 'su yüzü − h' });
    const zf = ek('zf', 'Temel alt kotu', zt - S.tb, 'm', 'türetilen', { f: 'taban − taban plağı' });
    const en = ek('en', 'Ayak izi eni', ng * bg + (ng - 1) * S.ti + 2 * S.tw, 'm', 'türetilen', { f: 'göz·en + ara duvarlar + 2·dış duvar' });
    const boy = ek('boy', 'Ayak izi boyu', S.bG + L + S.bC + 4 * S.tw, 'm', 'türetilen', { f: 'giriş kanalı + göz boyu + çıkış kanalı + 4·duvar' });
    ek('sen', 'Hidrolik senaryolar', 'ayırıcı kapak açık (tam karışım) · kapalı (kademeli karışım)', '', 'standart', { not: '3. parçada profil iki senaryoyla kontrol edilir' });

    if (!V) uyari.push('Anaerobik havuz ölçüleri proses hesabında eksik.');
    if (t && (t < 0.5 || t > 1.5)) uyari.push(`Temas süresi ${t.toFixed(2).replace('.', ',')} sa; ATV-DVWK-A 131'e göre 0,5–1,5 sa olmalı.`);
    return {
      id, tip: 'anaerobik', params: P, uyari, koku: false,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: 0, y: r3(en / 2), z: zs }, cikis: { x: r3(boy), y: r3(en / 2), z: zs },
      girisler: ['ham su', 'geri devir', 'süzüntü suyu'],
      kot: { su: zs, ust: zu, taban: zt, temel: zf, zemin: zz },
    };
  };

  /* ---------- BİYOLOJİK HAVUZ KARTI (karusel şablonu — Zeytinli AAT T107, app/karusel.js) ----------
     Firma kararı (11.11.2026): tüm proses tiplerinde karusel. Bölmeler duvarsız bölgelerdir:
     anoksik = mikserli bölge, aerobik = difüzörlü bölge; hacim oranları ATV'den.
     Geometri, düz uzunluk, mikser seçimi ve difüzör sayısı karusel modülünden (yeniden yazılmaz):
     kar = { DEF, Ls(V, e), geo(e) } → tarayıcıda C.KARUSEL_DEF, C.karuselLs, C.karuselGeo. */
  const ZAD = { AN: 'Anaerobik', AX: 'Anoksik', OX: 'Aerobik', SIM: 'Simultane DN', INT: 'Kesikli DN', ST: 'Bölme' };
  K.bioKart = (id, dim, j, par, kar) => {
    par = par || {}; dim = dim || {}; j = j || {};
    const P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };
    if (!kar || !kar.geo || !kar.Ls) return { id, tip: 'bio', params: P, uyari: ['Karusel şablonu (karusel.js) yüklenmemiş.'], ayakIzi: null, kot: {} };
    const D = kar.DEF || {};
    // hesaptan
    ek('sis', 'Proses tipi', j.sistemAd || j.sistem || '—', '', 'hesap');
    const N = ek('N', 'Havuz sayısı', Math.max(1, Math.round(+dim.N || 1)), 'adet', 'hesap');
    const h = ek('h', 'Su derinliği', +dim.h || D.h || 0, 'm', 'hesap');
    const V = ek('V', 'Toplam hacim', N * (+dim.L || 0) * (+dim.W || 0) * (+dim.h || 0), 'm³', 'hesap', { f: 'ATV: hat × L × W × h' });
    const zs0 = (dim.zones || []).filter(z => z.t !== 'AN');
    const fT = zs0.reduce((s, z) => s + (z.f != null ? z.f : 1 / zs0.length), 0) || 1;
    const bolge = zs0.map(z => ({ t: z.t, ad: z.n || ZAD[z.t] || z.t, f: (z.f != null ? z.f : 1 / zs0.length) / fT }));
    ek('sira', 'Bölge sırası', bolge.length ? bolge.map(b => `${ZAD[b.t] || b.ad} %${Math.round(b.f * 100)}`).join(' → ') : 'tek aerobik hacim', '', 'hesap', { not: 'Karuselde duvarsız: anoksik = mikserli, aerobik = difüzörlü bölge' });
    // şablon (standart)
    const S = {};
    const sab = [['Ro', 'Dış duvar iç yarıçapı', 'm'], ['tw', 'Orta duvar kalınlığı', 'm'], ['two', 'Dış duvar kalınlığı', 'm'], ['rg', 'Kılavuz duvar yarıçapı', 'm'], ['tg', 'Kılavuz duvar kalınlığı', 'm'], ['fb', 'Hava payı', 'm'], ['tb', 'Taban plağı kalınlığı', 'm']];
    for (const [k, ad, b] of sab) S[k] = dz(k, ad, +D[k], b, 'standart', 'Zeytinli T107 şablonu');
    S.pz = dz('pz', 'Duvar üstü — zeminden en az yükseklik', 0.65, 'm', 'standart');
    // elle
    const zs = dz('zs', 'Su yüzü kotu', 0, 'm', 'elle', '3. parçada hidrolik profilden gelecek');
    const zzVars = zs + S.fb - S.pz;
    const zzO = par.zz != null && par.zz !== '' && isFinite(+par.zz);
    const zz = ek('zz', 'Zemin kotu', zzO ? +par.zz : zzVars, 'm', 'elle', { duz: true, deg: zzO, vars: r3(zzVars), not: '2. parçada araziden okunacak' });
    // türetilen (karusel modülü)
    const e = Object.assign({}, D, { N, h, Ro: S.Ro, tw: S.tw, two: S.two, rg: S.rg, tg: S.tg, fb: S.fb, tb: S.tb });
    const Ls = ek('Ls', 'Düz uzunluk (havuz başına)', kar.Ls(V, e), 'm', 'türetilen', { f: 'hacimden — karusel.js' });
    e.Ls = Ls;
    const G = kar.geo(e);
    ek('b', 'Koridor genişliği', G.b, 'm', 'türetilen', { f: 'Ro − orta duvar / 2' });
    ek('Vk', 'Şablon hacmi (kontrol)', G.V, 'm³', 'türetilen', { f: 'karusel geometrisinden' });
    const Lp = 2 * Ls + Math.PI * (S.tw / 2 + S.Ro);
    ek('Lp', 'Döngü boyu (koridor ekseni)', Lp, 'm', 'türetilen', { f: '2·Ls + π·(orta duvar/2 + Ro)' });
    for (const b of bolge) ek('bl_' + b.t + '_' + Math.round(b.f * 100), `${ZAD[b.t] || b.ad} bölge boyu`, b.f * Lp, 'm', 'türetilen', { f: `döngü × %${Math.round(b.f * 100)}` });
    if (G.mix) ek('mix', 'Mikser (havuz başına)', `${G.mix.n} × ${G.mix.name}, ${(G.mix.n * G.mix.P).toFixed(1).replace('.', ',')} kW, hız ${(+G.mix.v).toFixed(2).replace('.', ',')} m/s`, '', 'katalog', { not: 'Mikser programının itki dengesiyle seçildi' });
    ek('nDif', 'Difüzör (toplam)', G.nDif || 0, 'adet', 'türetilen', { f: 'difüzör ızgarası × havuz' });
    const adaylar = [[zs + S.fb, 'su yüzü + hava payı'], [zz + S.pz, 'zemin + 0,65']];
    const [zuV, neden] = adaylar.reduce((a, c) => (c[0] > a[0] + 1e-9 ? c : a));
    const zu = ek('zu', 'Duvar üstü kotu', zuV, 'm', 'türetilen', { f: 'en büyük(su yüzü + hava payı ; zemin + 0,65)', not: 'Belirleyen: ' + neden });
    const zt = ek('zt', 'Taban kotu', zs - h, 'm', 'türetilen', { f: 'su yüzü − h' });
    const zf = ek('zf', 'Temel alt kotu', zt - S.tb, 'm', 'türetilen', { f: 'taban − taban plağı' });
    const en = ek('en', 'Ayak izi eni', G.Wo, 'm', 'türetilen', { f: 'karusel geometrisinden' });
    const boy = ek('boy', 'Ayak izi boyu', G.Lo, 'm', 'türetilen', { f: 'karusel geometrisinden' });
    if (D.kapGiris) ek('kap', 'Giriş / çıkış kapakları', `${D.kapGiris} / ${D.kapCikis}`, 'mm', 'katalog', { not: 'Zeytinli T107' });

    if (!V) uyari.push('Biyolojik havuz ölçüleri proses hesabında eksik.');
    if (G.mix && G.mix.warn) uyari.push('Mikser: ' + G.mix.warn + '.');
    if (G.mix && G.mix.ok === false) uyari.push('Uygun mikser bulunamadı; koridor dar ya da hız hedefi tutmuyor.');
    if (Ls <= 10.001) uyari.push('Hacim küçük: düz uzunluk alt sınırda (10 m); havuz sayısını azaltmayı düşünün.');
    return {
      id, tip: 'bio', params: P, uyari, koku: false,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: 0, y: r3(en / 2), z: zs }, cikis: { x: r3(boy), y: r3(en / 2), z: zs },
      karusel: { N, Ls, h, Ro: S.Ro, tw: S.tw, two: S.two, rg: S.rg, tg: S.tg, fb: S.fb, tb: S.tb, zt: zu }, // 6. adımda KARUSEL varlığına aktarılır
      kot: { su: zs, ust: zu, taban: zt, temel: zf, zemin: zz },
    };
  };

  /* ---------- SON ÇÖKELTME KARTI (dairesel, merkezden beslemeli, çevre savaklı, döner köprülü) ----------
     Standartlar Çokal AAT T-108 çiziminden (A-A kesiti, plan): iç Ø12,20, duvar 20 cm, giriş yapısı Ø2,00;
     taban merkeze 1/12 eğimli, ortada çamur hunisi; toplama kanalı 30 cm, duvardan 30 cm içeride;
     su yüzü 96,05 → savak 96,00 → kanal tabanı 95,55; duvar üstü 97,25 (hava payı 1,20); çıkış yapısı iç 1,50 m duvara bitişik.
     Havuz sayısı mevcut kademeden; nihai kademedeki fazlası "gelecek kademe" ayak izi olarak işaretlenir. */
  K.STD_SC = {
    tw: { ad: 'Duvar kalınlığı', v: 0.20, birim: 'm' },
    hp: { ad: 'Hava payı (su yüzü → duvar üstü)', v: 1.20, birim: 'm' },
    pz: { ad: 'Duvar üstü — zeminden en az yükseklik', v: 0.65, birim: 'm' },
    bk: { ad: 'Toplama kanalı genişliği', v: 0.30, birim: 'm' },
    ak: { ad: 'Toplama kanalı — duvar arası', v: 0.30, birim: 'm' },
    sv: { ad: 'Su yüzü → savak kotu', v: 0.05, birim: 'm' },
    kd: { ad: 'Savak → kanal tabanı', v: 0.45, birim: 'm' },
    ho: { ad: 'Çamur hunisi derinliği (merkez tabandan)', v: 1.36, birim: 'm' },
    tb: { ad: 'Taban plağı kalınlığı', v: 0.40, birim: 'm' },
    bc: { ad: 'Çıkış yapısı iç genişliği', v: 1.50, birim: 'm' },
    tc: { ad: 'Çıkış yapısı duvarı', v: 0.30, birim: 'm' },
  };
  K.scKart = (id, dim, par, dimN) => {
    par = par || {}; dim = dim || {}; dimN = dimN || dim;
    const P = [], uyari = [];
    const ek = (k, ad, v, birim, kaynak, o) => { const x = Object.assign({ k, ad, v: typeof v === 'number' ? r3(v) : v, birim, kaynak }, o); P.push(x); return x.v; };
    const dz = (k, ad, v, birim, kaynak, not) => { const o = par[k] != null && par[k] !== '' && isFinite(+par[k]); return ek(k, ad, o ? +par[k] : v, birim, kaynak, { duz: true, deg: o, vars: v, not }); };
    // hesaptan
    const N = ek('N', 'Havuz sayısı (mevcut kademe)', Math.max(1, Math.round(+dim.N || 1)), 'adet', 'hesap');
    const NN = ek('NN', 'Havuz sayısı (nihai kademe)', Math.max(1, Math.round(+dimN.N || 1)), 'adet', 'hesap');
    const D = ek('D', 'İç çap', +dim.D || 0, 'm', 'hesap');
    const Din = ek('Din', 'Giriş yapısı çapı', +dim.Din || 0, 'm', 'hesap');
    const h = ek('h', 'Kenar su derinliği', +dim.h || 0, 'm', 'hesap');
    ek('sl', 'Taban eğimi', +dim.slope || 0, 'm/m', 'hesap');
    const sl = +dim.slope || 0; // hesapta yuvarlanmamış değer
    if (+dimN.D && Math.abs(+dimN.D - D) > 0.01) ek('DN', 'İç çap (nihai kademe hesabı)', +dimN.D, 'm', 'hesap', { not: 'Gelecek havuzlar mevcut çapla çizilir' });
    const S = {}; for (const [k, s] of Object.entries(K.STD_SC)) S[k] = dz(k, s.ad, s.v, s.birim, 'standart', 'Çokal AAT T-108');
    ek('ekip', 'Ekipman', 'döner köprü (çevre duvarında tahrikli), taban ve yüzey sıyırıcı, V çentikli savak, köpük engeli ve köpük hunisi', '', 'katalog');
    // elle
    const zs = dz('zs', 'Su yüzü kotu', 0, 'm', 'elle', '3. parçada hidrolik profilden gelecek');
    const zzVars = zs + S.hp - S.pz;
    const zzO = par.zz != null && par.zz !== '' && isFinite(+par.zz);
    const zz = ek('zz', 'Zemin kotu', zzO ? +par.zz : zzVars, 'm', 'elle', { duz: true, deg: zzO, vars: r3(zzVars), not: '2. parçada araziden okunacak' });
    // türetilen
    const adaylar = [[zs + S.hp, 'su yüzü + hava payı'], [zz + S.pz, 'zemin + 0,65']];
    const [zuV, neden] = adaylar.reduce((a, c) => (c[0] > a[0] + 1e-9 ? c : a));
    const zu = ek('zu', 'Duvar üstü kotu (köprü yolu)', zuV, 'm', 'türetilen', { f: 'en büyük(su yüzü + hava payı ; zemin + 0,65)', not: 'Belirleyen: ' + neden });
    const zsv = ek('zsv', 'Savak kotu', zs - S.sv, 'm', 'türetilen', { f: 'su yüzü − pay' });
    ek('zk', 'Toplama kanalı tabanı', zsv - S.kd, 'm', 'türetilen', { f: 'savak − kanal derinliği' });
    const zk0 = ek('zke', 'Kenar taban kotu', zs - h, 'm', 'türetilen', { f: 'su yüzü − kenar su derinliği' });
    const zm = ek('zm', 'Merkez taban kotu', zk0 - sl * (D / 2 - Din / 2), 'm', 'türetilen', { f: 'kenar taban − eğim × (R − giriş yapısı yarıçapı)' });
    const zh = ek('zh', 'Çamur hunisi dibi', zm - S.ho, 'm', 'türetilen', { f: 'merkez taban − huni derinliği' });
    ek('zf', 'Temel alt kotu (kenarda)', zk0 - S.tb, 'm', 'türetilen', { f: 'kenar taban − taban plağı' });
    ek('Ls', 'Savak boyu (havuz başına)', Math.PI * (D - 2 * S.ak - S.bk), 'm', 'türetilen', { f: 'π × kanal ekseni çapı' });
    const ng = ek('ng', 'Gelecek kademe havuzu (boş ayak izi)', Math.max(0, NN - N), 'adet', 'türetilen', { f: 'nihai − mevcut', not: 'Genel yerleşimde kesikli çizgiyle gösterilir' });
    const en = ek('en', 'Ayak izi eni (havuz başına)', D + 2 * S.tw, 'm', 'türetilen', { f: 'iç çap + 2·duvar' });
    const boy = ek('boy', 'Ayak izi boyu (havuz + çıkış yapısı)', D + 2 * S.tw + S.bc + S.tc, 'm', 'türetilen', { f: 'dış çap + çıkış yapısı' });

    if (!D) uyari.push('Son çökeltme ölçüleri proses hesabında eksik.');
    if (Din && (Din / D < 0.15 || Din / D > 0.25)) uyari.push(`Giriş yapısı çapı iç çapın %${Math.round(Din / D * 100)}'i; raporda 0,15–0,25 katı önerilir.`);
    if (NN < N) uyari.push('Nihai kademe havuz sayısı mevcuttan az; kademe seçimini kontrol edin.');
    return {
      id, tip: 'sc', params: P, uyari, koku: false, adet: N, gelecek: ng,
      ayakIzi: { en: r3(en), boy: r3(boy) },
      giris: { x: r3(en / 2), y: r3(en / 2), z: zs }, cikis: { x: r3(boy), y: r3(en / 2), z: zsv }, // giriş: merkezden, alttan boruyla
      kot: { su: zs, ust: zu, savak: zsv, kenar: zk0, merkez: zm, huni: zh, zemin: zz },
    };
  };

  /* ---------- tüm kartlar ---------- */
  /* opts.ayakIzi(u, dim) → { en, boy } : taslak ünitelerin ayak izi (tarayıcıda proses.js yerleşiminden) */
  K.kartlar = (j, ayar, opts) => {
    ayar = ayar || {}; opts = opts || {};
    const sec = ayar.sec || {}, par = ayar.par || {}, Z = K.zincir(j, sec), kat = opts.katalog || katalog();
    const uN = Z.kademe.nihai.units || {}, uM = Z.kademe.mevcut.units || {};
    const veri = id => (K.NIHAI.has(id) ? uN : uM)[id] || null;
    for (const x of [...Z.su, ...Z.camur, ...Z.yard]) {
      if (x.durum === 'kart' && x.tip === 'izgara') {
        const dims = x.id === 'izB' ? x.kaynak.map(u => ({ rol: u === 'cs' ? 'kaba' : 'ince', dim: veri(u).dim })) : [{ rol: x.id === 'cs' ? 'kaba' : 'ince', dim: veri(x.id).dim }];
        x.kart = K.izgaraKart(x.id, dims, par[x.id], kat);
        x.ayakIzi = x.kart.ayakIzi;
      } else if (x.durum === 'kart' && x.tip === 'sc') {
        x.kart = K.scKart(x.id, veri(x.id).dim, par[x.id], (uN[x.id] || {}).dim);
        x.ayakIzi = x.kart.ayakIzi; x.adet = x.kart.adet; x.gelecek = x.kart.gelecek;
      } else if (x.durum === 'kart' && x.tip === 'bio') {
        const kar = opts.karusel || (C && C.karuselGeo ? { DEF: C.KARUSEL_DEF, Ls: C.karuselLs, geo: C.karuselGeo } : null);
        x.kart = K.bioKart(x.id, veri(x.id).dim, j, par[x.id], kar);
        x.ayakIzi = x.kart.ayakIzi;
      } else if (x.durum === 'kart' && x.tip === 'anaerobik') {
        x.kart = K.anaerobikKart(x.id, veri(x.id).dim, Z.kademe.mevcut.debi, par[x.id], sec);
        x.ayakIzi = x.kart.ayakIzi;
      } else if (x.durum === 'kart' && x.tip === 'debimetre') {
        x.kart = K.debimetreKart(x.id, Z.kademe.nihai.debi, Z.kademe.mevcut.debi, par[x.id], sec, C && C.CATALOG && C.CATALOG.PE && C.CATALOG.PE.sizes);
        x.ayakIzi = x.kart.ayakIzi;
      } else if (x.durum === 'kart' && x.tip === 'terfi') {
        x.kart = K.terfiKart(x.id, veri(x.id).dim, par[x.id], (uM[x.id] || {}).dim, sec);
        x.bitisik = x.kart.bitisik; // 2. parça: bitişikse ön arıtma bloğunda, ayrıysa ayrı kutu
        x.ayakIzi = x.kart.ayakIzi;
      } else if (x.durum === 'kart' && x.tip === 'kum') {
        x.kart = K.kumKart(x.id, veri(x.id).dim, par[x.id], sec);
        x.ayakIzi = x.kart.ayakIzi;
      } else if (x.durum === 'taslak' && opts.ayakIzi) {
        const v = veri(x.id); try { x.ayakIzi = v ? opts.ayakIzi(x.id, v.dim) : null; } catch (e) { x.ayakIzi = null; }
      }
    }
    return Z;
  };

  if (C) C.kart = K;
  if (typeof module !== 'undefined' && module.exports) module.exports = K;
  if (typeof document === 'undefined' || !C || !C.addCommand) return;

  /* ================= PENCERE (yalnız tarayıcı) ================= */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fm = (v, n) => (typeof v === 'number' ? v.toFixed(n == null ? 2 : n).replace('.', ',') : esc(v));
  const RENK = { hesap: '#4c9be8', standart: '#e0a030', katalog: '#9b6ad6', elle: '#d9534f', 'türetilen': '#5cb85c' };
  const DURUM = { kart: ['kart', '#5cb85c'], taslak: ['taslak', '#8a96a3'], eksik: ['hesapta yok', '#d9534f'], bekliyor: ['şablon bekliyor', '#8a96a3'] };
  const rozet = (t, c) => `<span style="display:inline-block;padding:0 6px;border-radius:8px;font-size:11px;line-height:17px;color:#fff;background:${c}">${esc(t)}</span>`;
  const ayar = () => { const s = C.doc.set; s.uniteKart = s.uniteKart || {}; s.uniteKart.sec = s.uniteKart.sec || {}; s.uniteKart.par = s.uniteKart.par || {}; return s.uniteKart; };
  const ayakIzi = (u, dim) => {
    if (!C.prosesKind || !C.uniteLayout) return null;
    const k = C.prosesKind(u, dim), t = C.prosesKalinlik ? C.prosesKalinlik(k) : [0.4, 0.3, 0.5];
    const lay = C.uniteLayout({ kind: k, d: dim, tw: t[0], ti: t[1] || 0.3 });
    return lay && lay.Lo ? { en: r3(lay.Wo), boy: r3(lay.Lo) } : null;
  };
  K.hesapla = () => { const j = C.proses && C.proses(); return j ? K.kartlar(j, ayar(), { ayakIzi }) : null; };

  C.uniteKartPencere = () => {
    if (!(C.proses && C.proses())) { C.warn('Proses verisi yok. ATV hesabından "ArıtmaCAD\'e aktar" deyin ya da PROSESAC ile dosya açın.'); return; }
    const A = ayar(); let secId = null;
    const b = C.modal('Ünite kartları — akış zinciri', `<div id="ukUst" style="margin-bottom:10px"></div>
      <div style="display:grid;grid-template-columns:minmax(240px,340px) minmax(0,1fr);gap:14px;min-height:460px;max-height:70vh">
      <div id="ukL" style="overflow:auto;border-right:1px solid var(--line,#3a4250);padding-right:8px"></div><div id="ukR" style="overflow:auto"></div></div>
      <div class="bar" style="justify-content:space-between;margin-top:10px"><div class="hint">${Object.entries(RENK).map(([k, c]) => rozet(k, c)).join(' ')}</div>
      <div style="display:flex;gap:8px"><button id="ukLog">Listeyi komut satırına yaz</button><button id="ukKapat" class="pri">Kapat</button></div></div>`);
    const box = document.querySelector('#modal .box'); if (box) box.style.width = 'min(1240px,97vw)';
    const U = b.querySelector('#ukUst'), L1 = b.querySelector('#ukL'), R1 = b.querySelector('#ukR');
    const sel = (k, ad, opts, v) => `<label style="margin-right:12px;white-space:nowrap">${esc(ad)} <select data-sec="${k}">${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
    const ciz = () => {
      const Z = K.hesapla(); if (!Z) return;
      const kd = Z.kademe, kOpt = kd.liste.map((k, i) => [i, `${k.ad}${k.debi && k.debi.Qww ? ' (Q maks. ' + Math.round(k.debi.Qww) + ' m³/h)' : ''}`]);
      U.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px 0;align-items:center">
        ${sel('onaritma', 'Ön arıtma', [['A', 'A: kaba ızgara → terfi → ince ızgara'], ['B', 'B: kaba + ince aynı kanalda → terfi']], A.sec.onaritma || 'A')}
        ${sel('debimetre', 'Debimetre', [['MAN', 'Manyetik'], ['PAR', 'Parshall savağı']], A.sec.debimetre || 'MAN')}
        ${sel('cikis', 'Çıkış', [['DEZ', 'Dezenfeksiyon ve çıkış'], ['GK', 'Geri kazanım']], A.sec.cikis || 'DEZ')}
        ${sel('blowerKum', 'Kum tutucu blowerı', [['ANA', 'Ana blower binasında'], ['AYRI', 'Yanında küçük binada']], A.sec.blowerKum || 'ANA')}
        ${sel('terfiYer', 'Terfi yerleşimi', [['BITISIK', 'Izgara ve kum tutucuya bitişik'], ['AYRI', 'Ayrı yapı']], A.sec.terfiYer || 'BITISIK')}
        ${sel('anGoz', 'Anaerobik göz', [['3', '3 göz (ayırıcı kapaklı)'], ['1', 'Tek göz']], A.sec.anGoz || '3')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px 0;margin-top:6px">${sel('nihai', 'Nihai kademe (ön arıtma)', kOpt, kd.iN)}${sel('mevcut', 'Mevcut kademe (havuzlar)', kOpt, kd.iM)}</div>
        ${Z.uyari.length ? `<div class="hint" style="color:#e0a030;margin-top:6px">${Z.uyari.map(esc).join('<br>')}</div>` : ''}`;
      U.querySelectorAll('[data-sec]').forEach(s => s.onchange = () => { A.sec[s.dataset.sec] = s.value; C.changed && C.changed(); ciz(); });
      const grup = (ad, xs) => xs.length ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin:8px 0 4px">${esc(ad)}</div>` + xs.map(x => {
        const d = DURUM[x.durum] || DURUM.taslak, ai = x.ayakIzi ? `${fm(x.ayakIzi.en)} × ${fm(x.ayakIzi.boy)} m${x.adet > 1 ? ' × ' + x.adet : ''}${x.gelecek ? ' (+' + x.gelecek + ' gelecek kademe)' : ''}` : '—';
        return `<button data-k="${x.id}" style="display:block;width:100%;text-align:left;margin:2px 0;${x.id === secId ? 'border-color:var(--acc,#4c9be8);background:rgba(76,155,232,.15)' : ''}">
          <b>${esc(x.kod)}</b> ${esc(x.ad)} ${rozet(d[0], d[1])}<br><span class="hint">${x.kademe} kademe · ayak izi ${ai}${x.koku ? ' · koku' : ''}</span></button>`;
      }).join('') : '';
      L1.innerHTML = grup('Su hattı', Z.su) + grup('Çamur hattı', Z.camur) + grup('Yardımcı', Z.yard);
      L1.querySelectorAll('[data-k]').forEach(x => x.onclick = () => { secId = x.dataset.k; ciz(); });
      const hepsi = [...Z.su, ...Z.camur, ...Z.yard], x = hepsi.find(y => y.id === secId) || hepsi.find(y => y.kart) || hepsi[0];
      if (!x) { R1.innerHTML = ''; return; }
      secId = x.id; detay(x, kd);
    };
    const detay = (x, kd) => {
      const kdm = x.kademe === 'nihai' ? kd.nihai : kd.mevcut;
      let h = `<div style="font-weight:600;font-size:15px">${esc(x.kod)} ${esc(x.ad)}</div>
        <div class="hint" style="margin-bottom:8px">${x.kademe === 'nihai' ? 'Nihai' : 'Mevcut'} kademe: ${esc(kdm.ad)}${x.sonraki ? ' · sonraki ünite ' + esc(x.sonraki) : ''}${x.koku ? ' · koku bayrağı: kapalı örtü ve emiş kanalı' : ''}${x.secenek ? ' · ' + esc(x.secenek) : ''}${x.hat ? ' · ' + x.hat + ' hat' : ''}</div>`;
      if (!x.kart) {
        const m = { taslak: 'Bu ünitenin kartı henüz yok; ayak izi proses hesabındaki ebatlardan alındı.', eksik: 'Bu ünite proses hesabında yok. ATV penceresinde üniteyi seçip yeniden aktarın.', bekliyor: 'Bu ünitenin şablonu henüz yok; sonraki adımlarda eklenecek.' }[x.durum] || '';
        R1.innerHTML = h + `<p>${esc(m)}</p>${x.ayakIzi ? `<p>Ayak izi: ${fm(x.ayakIzi.en)} × ${fm(x.ayakIzi.boy)} m</p>` : ''}`; return;
      }
      const k = x.kart;
      h += `<table class="bom" style="width:100%"><thead><tr><th>Parametre</th><th>Değer</th><th>Birim</th><th>Kaynak</th></tr></thead><tbody>`;
      for (const p of k.params) {
        const v = p.duz ? `<input data-p="${p.k}" type="number" step="any" value="${p.v}" style="width:80px${p.deg ? ';border-color:#d9534f' : ''}">${p.deg ? ` <button data-sil="${p.k}" title="Varsayılan: ${fm(p.vars, 3)}">↺</button>` : ''}` : `<b>${fm(p.v, p.birim === 'adet' || p.birim === 'mm' || p.birim === '°' ? 0 : 2)}</b>`;
        h += `<tr><td>${esc(p.ad)}${p.f ? `<div class="hint">= ${esc(p.f)}</div>` : ''}${p.not ? `<div class="hint">${esc(p.not)}</div>` : ''}</td><td style="white-space:nowrap">${v}</td><td>${esc(p.birim)}</td><td>${rozet(p.kaynak + (p.deg ? ' (değişti)' : ''), RENK[p.kaynak] || '#888')}</td></tr>`;
      }
      h += '</tbody></table>';
      if (k.uyari.length) h += `<div class="hint" style="color:#e0a030;margin-top:8px">${k.uyari.map(esc).join('<br>')}</div>`;
      R1.innerHTML = h;
      const pr = () => (A.par[x.id] = A.par[x.id] || {});
      R1.querySelectorAll('[data-p]').forEach(i => i.onchange = () => { const v = parseFloat(String(i.value).replace(',', '.')); if (isFinite(v)) pr()[i.dataset.p] = v; else delete pr()[i.dataset.p]; C.changed && C.changed(); ciz(); });
      R1.querySelectorAll('[data-sil]').forEach(i => i.onclick = () => { delete pr()[i.dataset.sil]; C.changed && C.changed(); ciz(); });
    };
    ciz();
    let done = false; const fin = () => { if (done) return; done = true; clearInterval(tm); if (box) box.style.width = ''; C.closeModal(); };
    b.querySelector('#ukKapat').onclick = fin;
    b.querySelector('#ukLog').onclick = () => { C.uniteKartListe(); };
    const tm = setInterval(() => { const m = document.querySelector('#modal'); if (m && m.classList.contains('hidden')) fin(); }, 300);
  };

  C.uniteKartListe = () => {
    const Z = K.hesapla(); if (!Z) { C.warn('Proses verisi yok.'); return; }
    C.log(`Ünite kartları — nihai kademe: ${Z.kademe.nihai.ad}, mevcut kademe: ${Z.kademe.mevcut.ad}`);
    for (const [ad, xs] of [['Su hattı', Z.su], ['Çamur hattı', Z.camur], ['Yardımcı', Z.yard]]) {
      if (!xs.length) continue; C.log('  ' + ad + ':');
      for (const x of xs) C.log(`    ${x.kod} ${x.ad} — ${x.kademe} kademe — ${(DURUM[x.durum] || [x.durum])[0]}${x.ayakIzi ? ` — ayak izi ${fm(x.ayakIzi.en)} × ${fm(x.ayakIzi.boy)} m` : ''}${x.kart ? ` — platform ${fm(x.kart.kot.platform)}, kanal derinliği ${fm(x.kart.params.find(p => p.k === 'D').v)} m` : ''}`);
    }
    for (const u of Z.uyari) C.warn(u);
  };

  C.addCommand(['UNITEKART', 'UNITEKARTLARI', 'KARTLAR'], 'Proses verisinden akış zincirini ve ünite kartlarını gösterir (ön arıtma seçeneği, kademeler, ızgara yapısı kot zinciri ve ayak izleri).', async () => { C.uniteKartPencere(); }, { noUndo: true });
  C.addCommand(['UNITEKARTLISTE'], 'Ünite kartlarının listesini ve ayak izlerini komut satırına yazar.', async () => { C.uniteKartListe(); }, { noUndo: true });

  /* şerit: Arıtma → Proses paneline */
  try {
    const tab = C.ribbon && C.ribbon.tabs && C.ribbon.tabs.find(t => t[0] === 'Arıtma'), pn = tab && tab[1].find(p => p[0] === 'Proses');
    if (pn && !pn[1].some(x => x.cmd === 'UNITEKART')) { const i = pn[1].findIndex(x => x.cmd === 'PROSES'); pn[1].splice(i + 1, 0, { cmd: 'UNITEKART', t: 'Ünite kartları', i: 'table', big: true }); C.ribbon.render(); }
  } catch (er) { console.error('ünite kartı şerit', er); }

  /* çizim / pafta dili */
  try {
    if (window.DIL) window.DIL.ekle('en', 'English', [
      ['Kaba ızgara yapısı', 'Coarse screen structure'], ['İnce ızgara yapısı', 'Fine screen structure'], ['Kaba ve ince ızgara yapısı (aynı kanal)', 'Coarse and fine screen structure (common channel)'],
      ['Giriş terfi istasyonu', 'Inlet pumping station'], ['Kum ve yağ tutucu', 'Grit and grease chamber'], ['Debimetre', 'Flow meter'], ['Ön çökeltme', 'Primary clarifier'],
      ['Dağıtma yapısı (biyolojik havuzlar)', 'Distribution chamber (biological tanks)'], ['Dağıtma yapısı (son çökeltme)', 'Distribution chamber (final clarifiers)'],
      ['Anaerobik havuz', 'Anaerobic tank'], ['Biyolojik havuz', 'Biological tank'], ['Son çökeltme', 'Final clarifier'], ['Dezenfeksiyon ve çıkış yapısı', 'Disinfection and outlet structure'],
      ['Çıkış yapısı', 'Outlet structure'], ['Geri kazanım üniteleri', 'Water reuse units'], ['Çamur yoğunlaştırma', 'Sludge thickening'], ['Çamur depolama / stabilizasyon', 'Sludge storage / stabilisation'],
      ['Çamur susuzlaştırma (dekantör binası)', 'Sludge dewatering (decanter building)'], ['Kimyasal fosfor giderimi', 'Chemical phosphorus removal'],
      ['Yürüme platformu kotu', 'Walkway platform level'], ['Izgara deşarj ağzı kotu', 'Screen discharge level'], ['Konveyör bandı kotu', 'Conveyor belt level'], ['Kanal taban kotu', 'Channel invert level'],
    ], {});
  } catch (er) { }
})(typeof window !== 'undefined' ? window.C : null);

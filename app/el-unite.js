/* ArıtmaCAD — PROSES ÜNİTESİ (HAVUZ) ELEKTRİK PROJESİ — E-BP düzeni (kullanıcı kararları 20–21.11.2026; docs/cizim-kurallari/elektrik.md §15)
   Örnek: Çorlu AAT T-200 BİO-P ANAEROBİK HAVUZU, (31)(32)(33) ÇRL E-BP 001/002/003. Bina (yaşam alanı) elektriği elektrik.js / el-pafta.js (E-BB düzeni) ile kalır.
   ELUNITEPAFTA : seçili havuzun (önce anaerobik) "Elektrik" grubunda üç paftası:
     1) GÜÇ, KUMANDA, ENSTRÜMAN KABLO VE TAVA PLANI — motor, JB, LCU, kablo tavası, kablolar (GK-1/…, KK-1/…, KK-LK-1/…, GK-2/…, KK-2/…), semboller,
        kablo etiketi açıklaması, notlar, galvaniz boru tablosu, kablo listesi (BOY boş: genel kablolamada)
     2) TOPRAKLAMA PLANI — 30x3.5 galvaniz şerit halka, Ø20 L=3 m çubuklar (TE), TB-1 barası, bağlantılar, topraklama sembolleri, bara detayı, hesap tablosu
     3) AYDINLATMA VE PRİZ TESİSATI PLANI — korkuluğa monte LED etanş armatür (4,80 m), BHAK anahtar kutusu, ışık linyeleri, 3 fazlı priz panosu,
        BHAK tek hat şeması, armatür montaj detayı, semboller, notlar
   Motor listesi mekanik ekipman listesinden (unite-mekanik.js kalem: mikser P, aktüatörlü kapak Pakt / katalog, elektrikli pergel vinç Pv). MCC yeri ve kablo
   boyları sorulmaz / hesaplanmaz: her kablonun boy alanı null (genel kablolama aşamasında doldurulur). Kesit motor gücünden, yalnız akım taşıma.
   Nesneler (model; elu = ünite id; 3B'de görünür):
     eluc { kind: motor|jb|lcu|arm|bhak|prizp|te|tb|mcc|etk, p:[x,y], ang, z, kod, P, satir (etk), q (etk ok ucu), elu }
     eluh { sys: tava|guc|kum|lk|guc2|kum2|enst|top|bag|ayd|priz|mcc, pts:[[x,y]], z, kod, cins, boy, n (tava sayısı), elu }
   YAPI TÜRÜ: havuz (E-BP) | yasam (E-BB). Havuz tipi üniteler kendiliğinden havuz; ELYAPITURU ile değiştirilir (e.elYapi).
   Saf kısım (akim, kesitSec, motorlar, kablolar, boruSec, tavaSec, bhak, armaturYerleri, otele, yapiTuru …) Node ile denenir: node test/el-unite.test.js */
(function (C) {
  'use strict';

  /* ======================= SAF KISIM ======================= */
  const KAT = { cos: 0.85, eta: 0.87, grup: 0.80, emn: 1.25, U: 400, cosB: 0.9 }; // KABUL (elektrik.md §15): motor cosφ / verim, tava gruplama, emniyet; BHAK cosφ
  /* NYY 0,6/1 kV, Cu, havada / tavada (VDE 0298-4, 30 °C), çok damarlı: kesit mm² → Iz (A) */
  const NYY_HAVA = [[1.5, 19.5], [2.5, 26], [4, 34], [6, 44], [10, 61], [16, 82], [25, 108], [35, 135], [50, 168], [70, 207], [95, 250], [120, 292]];
  /* NYY toprakta (el-hesap.js EL.NYY ile aynı): BHAK beslemesi (MCC'den yeraltı) */
  const NYY_TOPRAK = [[1.5, 27], [2.5, 36], [4, 47], [6, 59], [10, 79], [16, 102], [25, 133], [35, 159], [50, 188], [70, 232], [95, 280], [120, 318]];
  const SIGORTA = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
  const ust = (seri, v) => seri.find(x => x >= v - 1e-9) || seri[seri.length - 1];
  const nok = v => String(Math.round(+v * 100) / 100);             // 2.5 · 1.5 (örnekteki gibi nokta)
  const vir = (v, d = 2) => String(Math.round(+v * Math.pow(10, d)) / Math.pow(10, d)).replace('.', ',');
  const cins = (n, S, tip = 'NYY') => `${n}x${nok(S)} mm² ${tip}`;  // "4x2.5 mm² NYY" (E-BP 001 yazımı)

  /* motor anma akımı (A), 400 V üç faz */
  const akim = PkW => (+PkW > 0 ? +PkW * 1000 / (Math.sqrt(3) * KAT.U * KAT.cos * KAT.eta) : 0);
  /* güç kablosu kesiti: Iz · gruplama ≥ 1,25 · In, en az 2,5 mm² (örnek: 0,37 ve 3,1 kW → 4x2.5) */
  const kesitSec = In => { const ger = KAT.emn * (+In || 0) / KAT.grup, r = NYY_HAVA.find(([S, Iz]) => S >= 2.5 && Iz >= ger - 1e-9) || NYY_HAVA[NYY_HAVA.length - 1]; return { S: r[0], Iz: r[1], gerekli: ger }; };

  /* mekanik liste kalemlerinden motorlar (unite-mekanik.js kalem çıktısı; kod dolu).
     kapak: yalnız elektrikli aktüatörlü (gucYok değil) · mikser · pergel vinç: yalnız elektrikli · diğer: gücü olan
     → [{ kod, tur, P (kW | null), In, S, tanim }] */
  function motorlar(kalemler) {
    const out = [];
    for (const k of kalemler || []) {
      if (!k || !k.kod) continue;
      const tur = k.grup === 'kapak' ? 'kapak' : k.grup === 'mikser' ? 'mikser' : k.grup === 'vinc' ? 'vinc' : k.grup === 'diger' ? 'motor' : null;
      if (!tur || k.gucYok) continue;
      if (tur === 'motor' && !(+k.P > 0)) continue;
      const P = +k.P > 0 ? +k.P : null, In = akim(P || 0), S = kesitSec(In).S;
      out.push({ kod: k.kod, tur, P, In, S, tanim: k.tanim || '', veriYok: P == null });
    }
    const sira = { mikser: 0, kapak: 1, vinc: 2, motor: 3 };
    return out.sort((a, b) => (sira[a.tur] - sira[b.tur]) || a.kod.localeCompare(b.kod, 'tr', { numeric: true }));
  }

  /* bir motorun kabloları (E-BP 001 düzeni). boy: null — genel kablolamada doldurulur.
     kapak : GK-1 (güç) + KK-1 10x1.5 (kumanda), MCC-1'den
     mikser: KK-LK-1 10x1.5 (MCC-1 → LCU), GK-2 güç ve KK-2 3x1.5 (2. kademe: LCU → JB → motor) — örnekteki gibi (MCC → LCU güç kablosu örnekte yok: soruldu)
     vinç  : GK-1 (elektrikli palanga; kumanda kendi sarkıt butonundan — kabul) */
  function kablolar(m) {
    const k = m.kod, G = cins(4, m.S || 2.5), L = [];
    const kb = (kod, tur, cins_, nereden, nereye) => L.push({ kod, tur, cins: cins_, nereden, nereye, boy: null, ekipman: k, P: m.P, In: m.In });
    if (m.tur === 'enstruman') { kb(`PLC-1/${k}-1`, 'enst', cins(3, 1.5), 'PLC-1', k); kb(`PLC-1/${k}-2`, 'enst', cins(3, 1.5, 'LIYCY'), 'PLC-1', k); return L; }
    if (m.tur === 'mikser') { kb(`KK-LK-1/${k}`, 'lk', cins(10, 1.5), 'MCC-1', `LCU-${k}`); kb(`GK-2/${k}`, 'guc2', G, `LCU-${k}`, k); kb(`KK-2/${k}`, 'kum2', cins(3, 1.5), `LCU-${k}`, k); }
    else if (m.tur === 'vinc') kb(`GK-1/${k}`, 'guc', G, 'MCC-1', k);
    else { kb(`GK-1/${k}`, 'guc', G, 'MCC-1', k); kb(`KK-1/${k}`, 'kum', cins(10, 1.5), 'MCC-1', k); }
    return L;
  }
  const kabloListesi = ms => (ms || []).flatMap(kablolar);

  /* "GALV. BORULARDAN GEÇEN KABLOLAR" (E-BP 001 tablosu, birebir); 10x1.5 örnekte yok → 1" (kabul) */
  const BORU_TABLO = [['3/4"', '2*1,5, 3*1,5, 4*1,5'], ['1"', '4*2,5, 3*4, 4*4, 3*6'], ['1 1/4"', '4*6, 4*10, 4*16'], ['1 1/2"', '3*25+16, 3*35+16'], ['2"', '3*50+25'], ['2 1/2"', '3*70+35, 3*95+50'], ['3"', '3*120+70, 3*150+70']];
  const BORU_ESLE = { '2x1.5': '3/4"', '3x1.5': '3/4"', '4x1.5': '3/4"', '4x2.5': '1"', '3x4': '1"', '4x4': '1"', '3x6': '1"', '10x1.5': '1"', '3x2.5': '1"', '4x6': '1 1/4"', '4x10': '1 1/4"', '4x16': '1 1/4"' };
  const nS = c => { const m = String(c || '').match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)/i); return m ? { n: +m[1], S: +m[2].replace(',', '.') } : null; };
  const boruSec = c => { const q = nS(c); if (!q) return null; return BORU_ESLE[`${q.n}x${nok(q.S)}`] || (q.n * q.S <= 6 ? '3/4"' : q.n * q.S <= 24 ? '1"' : q.n * q.S <= 64 ? '1 1/4"' : '1 1/2"'); };
  /* kablo dış çapı (mm) yaklaşık: 7 + 2,2·√(n·S) — tava doluluğu için (kabul; 4x2.5 ≈ 14, 10x1.5 ≈ 15,5, 3x1.5 ≈ 11,7) */
  const disCap = c => { const q = nS(c); return q ? 7 + 2.2 * Math.sqrt(q.n * q.S) : 12; };
  /* gerçek tava ölçüsü (kullanıcı 21.11.2026): katalog genişliği, H = 60 mm, doluluk ≤ %40; 600 mm yetmezse paralel tava */
  const TAVA = { en: [100, 150, 200, 300, 400, 500, 600], h: 60, dol: 0.40 };
  const tavaKural = () => { const u = C && C.cizimKural && C.cizimKural.ELEKTRIK && C.cizimKural.ELEKTRIK.unite; return u && u.tavaEn ? { en: u.tavaEn, h: u.tavaH, dol: u.tavaDoluluk } : TAVA; };
  const tavaOlcu = cinsler => { const Tv = tavaKural(), A = (cinsler || []).reduce((t, c) => t + Math.PI / 4 * Math.pow(disCap(c), 2), 0), mx = Tv.en[Tv.en.length - 1], n = Math.max(1, Math.ceil(A / (mx * Tv.h * Tv.dol) - 1e-9)), g = A / n / (Tv.h * Tv.dol), w = Tv.en.find(x => x >= g - 1e-9) || mx;
    return { w, h: Tv.h, n, A, dolu: A / (n * w * Tv.h), ad: `${n > 1 ? n + 'x' : ''}${w}x${Tv.h} mm` }; };
  /* hat sınıfı: GK → AG; kumanda ve enstrüman → zayıf akım (KABUL, onay bekliyor) */
  const hatSinif = k => (/^guc/.test(k.tur) ? 'ag' : 'zayif');
  const tavada = k => !/2$/.test(k.tur);
  const tavaSec = L => { const Q = (L || []).filter(tavada), b = q => { const X = Q.filter(k => hatSinif(k) === q); return X.length ? tavaOlcu(X.map(k => k.cins)) : null; }; return { ag: b('ag'), zayif: b('zayif') }; };
  /* enstrümanlar: halka başına bir redoks metre (Çorlu ORP-200A/B/C) */
  const enstrumanlar = (un, n) => Array.from({ length: Math.max(0, n | 0) }, (_, i) => ({ kod: `ORP-${un}/${String.fromCharCode(65 + i)}`, tur: 'enstruman', P: null, In: 0, S: 1.5, tanim: 'Redoks metre (ORP)' }));

  /* BHAK anahtar kutusu (E-BP 003 tek hat şeması): ışık linyeleri 10A 3x2.5 NYY, priz panosu beslemeleri 3x40A 4x4 NYY (3000 W), yedekler (10A, 3x40A);
     ana şalter: kurulu akımın 1,25 katı ve en büyük çıkıştan bir kademe büyük; besleme GK-1/BHAK NYY (toprakta) Iz ≥ ana şalter, en az 4 mm² (örnek 3x50A, 4x6mm2 NYY) */
  function bhak(o) {
    o = o || {}; const cik = []; let i = 0; const no = () => String(++i).padStart(2, '0');
    for (const W of o.isik || []) cik.push({ no: no(), In: 10, faz: 1, kablo: '3x2.5 NYY', aciklama: 'IŞIK LİNYESİ', W: Math.round(W), tur: 'isik' });
    for (const W of o.priz || []) cik.push({ no: no(), In: 40, faz: 3, kablo: '4x4 NYY', aciklama: '3Ø PRİZ PANO BESLEME', W: Math.round(W == null ? 3000 : W), tur: 'priz' });
    const yd = o.yedek == null ? 2 : +o.yedek; for (let k = 0; k < yd; k++) cik.push({ no: no(), In: k % 2 ? 40 : 10, faz: k % 2 ? 3 : 1, kablo: '', aciklama: 'YEDEK', W: 0, tur: 'yedek' });
    const kurulu = cik.reduce((s, x) => s + x.W, 0), Ik = kurulu / (Math.sqrt(3) * KAT.U * KAT.cosB), enB = Math.max(0, ...cik.map(x => x.In));
    const In = Math.max(25, ust(SIGORTA, Ik * 1.25), SIGORTA[Math.min(SIGORTA.length - 1, SIGORTA.indexOf(ust(SIGORTA, enB)) + 1)]);
    let r = NYY_TOPRAK.find(([S, Iz]) => Iz >= In) || NYY_TOPRAK[NYY_TOPRAK.length - 1]; if (r[0] < 4) r = NYY_TOPRAK.find(q => q[0] === 4);
    return { cik, kurulu, Ik, In, S: r[0], Iz: r[1], kablo: `4x${nok(r[0])}mm2 NYY`, kod: 'GK-1/BHAK' };
  }

  /* polyline boyunca a aralıkla noktalar (ilk nokta a/2'de) → [{ p, ang (çizgi doğrultusu), s }] */
  function armaturYerleri(pts, a) {
    const out = []; a = +a || 4.8; if (!pts || pts.length < 2) return out;
    let s0 = 0, hedef = a / 2;
    for (let i = 1; i < pts.length; i++) { const A = pts[i - 1], B = pts[i], l = Math.hypot(B[0] - A[0], B[1] - A[1]); if (l < 1e-9) continue;
      while (hedef <= s0 + l + 1e-9) { const t = (hedef - s0) / l; out.push({ p: [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t], ang: Math.atan2(B[1] - A[1], B[0] - A[0]), s: hedef }); hedef += a; }
      s0 += l; }
    return out;
  }
  /* linye gruplama: armatür sayısı → linye başına en çok mx armatür (bina kuralıyla aynı 9; kabul) */
  const linyeSay = (n, mx = 9) => (n > 0 ? Math.ceil(n / mx) : 0);

  /* kapalı çokgeni d kadar dışa ötele (köşede açıortay, sivri köşede sınır) */
  const alan = pts => { let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; } return A / 2; };
  const cevre = pts => { let L = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return L; };
  function otele(pts, d) {
    const P = (pts || []).filter((p, i, A) => i === 0 || Math.hypot(p[0] - A[i - 1][0], p[1] - A[i - 1][1]) > 1e-6); if (P.length > 2 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 1e-6) P.pop();
    const n = P.length; if (n < 3) return P.slice(); const sg = alan(P) > 0 ? 1 : -1, out = [];
    for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
      const u1 = [b[0] - a[0], b[1] - a[1]], u2 = [c[0] - b[0], c[1] - b[1]], l1 = Math.hypot(...u1) || 1, l2 = Math.hypot(...u2) || 1;
      const n1 = [sg * u1[1] / l1, -sg * u1[0] / l1], n2 = [sg * u2[1] / l2, -sg * u2[0] / l2]; // dış normal (saat yönü tersinde sağ)
      let m = [n1[0] + n2[0], n1[1] + n2[1]]; const lm = Math.hypot(...m); if (lm < 1e-9) m = n1; else m = [m[0] / lm, m[1] / lm];
      const cs = Math.max(0.35, m[0] * n1[0] + m[1] * n1[1]); out.push([b[0] + m[0] * d / cs, b[1] + m[1] * d / cs]); }
    return out;
  }
  /* topraklama çubuklarının yeri: halkanın kutu köşelerine en yakın köşeleri (ilk 4), fazlası çevrede eşit aralıkla */
  function cubukYerleri(ring, n) {
    if (!ring || ring.length < 3) return []; n = Math.max(1, n | 0);
    const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]), K = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)], [Math.min(...xs), Math.max(...ys)]], out = [];
    for (const k of K.slice(0, Math.min(4, n))) { let b = null, bd = Infinity; for (const p of ring) { const d = Math.hypot(p[0] - k[0], p[1] - k[1]); if (d < bd && !out.some(q => q === p)) { bd = d; b = p; } } if (b) out.push(b); }
    /* fazlası: çevre boyunca en büyük boşluğun ortasına, tek tek */
    const kap = ring.concat([ring[0]]), sAc = [0]; for (let i = 1; i < kap.length; i++) sAc.push(sAc[i - 1] + Math.hypot(kap[i][0] - kap[i - 1][0], kap[i][1] - kap[i - 1][1])); const Lt = sAc[sAc.length - 1];
    const sOf = p => { let b = 0, bd = Infinity; for (let i = 1; i < kap.length; i++) { const a = kap[i - 1], c = kap[i], l2 = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2 || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (c[0] - a[0]) + (p[1] - a[1]) * (c[1] - a[1])) / l2)), d = Math.hypot(p[0] - a[0] - (c[0] - a[0]) * t, p[1] - a[1] - (c[1] - a[1]) * t); if (d < bd) { bd = d; b = sAc[i - 1] + Math.sqrt(l2) * t; } } return b; };
    const pOf = s => { s = ((s % Lt) + Lt) % Lt; for (let i = 1; i < kap.length; i++) if (s <= sAc[i] + 1e-9) { const t = (s - sAc[i - 1]) / ((sAc[i] - sAc[i - 1]) || 1); return [kap[i - 1][0] + (kap[i][0] - kap[i - 1][0]) * t, kap[i - 1][1] + (kap[i][1] - kap[i - 1][1]) * t]; } return kap[0]; };
    const S2 = out.map(sOf); while (S2.length < n) { const s = S2.slice().sort((a, b) => a - b); let bi = 0, bg = -1; for (let i = 0; i < s.length; i++) { const g = (i + 1 < s.length ? s[i + 1] : s[0] + Lt) - s[i]; if (g > bg) { bg = g; bi = i; } } S2.push(s[bi] + bg / 2); out.push(pOf(s[bi] + bg / 2)); }
    return out.map(p => [p[0], p[1]]);
  }

  /* yapı türü: havuz (E-BP) | yasam (E-BB). e.elYapi elle seçilir; havuz tipi üniteler kendiliğinden havuz */
  const HAVUZ_TIP = /^(anaerobik|aerobik|havuz|karusel|cokel|cokeltme|kumtutucu|kum_tutucu|izgara|dengeleme|biyolojik|klor|temas|camur|filtre|ontesis|on_arit|ozon)/i; // terfi istasyonu üst binalı olabilir: kendiliğinden havuz sayılmaz (ELYAPITURU ile seçilir; kullanıcıya soruldu)
  const yapiTuru = e => { if (!e) return null; if (e.elYapi === 'havuz' || e.elYapi === 'yasam') return e.elYapi; if (e.type === 'unite' || HAVUZ_TIP.test(String(e.type || ''))) return 'havuz'; return 'yasam'; };

  /* kablo etiketi satırları (örnek: "GK-1/Z-109" / "4x2.5 mm² NYY 173 mt"; boy yoksa yalnız cins) */
  const etiketSatir = k => [k.kod, k.cins + (k.boy != null && isFinite(k.boy) ? ` ${Math.round(k.boy)} mt` : '')];

  /* kablo listesi tablo satırları: KABLO NO · ÇIKTIĞI PANO · GİDECEĞİ YER · CİNSİ · MOTOR GÜCÜ (kW) · In (A) · GALV. BORU · BOY (m) */
  const LISTE_SUTUN = [{ t: 'KABLO NO', w: 30, al: 'L' }, { t: 'ÇIKTIĞI PANO', w: 22 }, { t: 'GİDECEĞİ YER', w: 26 }, { t: 'CİNSİ', w: 30 }, { t: 'MOTOR GÜCÜ (kW)', w: 20 }, { t: 'In (A)', w: 14 }, { t: 'GALV. BORU', w: 16 }, { t: 'BOY (m)', w: 26 }];
  const listeSatirlari = L => (L || []).map(k => [k.kod, k.nereden, k.nereye, k.cins, k.tur === 'guc' || k.tur === 'guc2' ? (k.P != null ? vir(k.P) : '-') : '', k.tur === 'guc' || k.tur === 'guc2' ? (k.In ? vir(k.In, 1) : '-') : '', boruSec(k.cins) || '', k.boy != null ? String(Math.round(k.boy)) : 'genel kablolamada']);

  /* HAVUZ ELEKTRİK RAPORU (saf): her elemanın hesabı. d: durum (motor, kablo, tava, bhak, topraklama, arm, armKod); tr: dil çevirisi.
     Boya bağlı gerilim düşümü yapılmaz; aydınlatma düzeyi hesaplanmaz (armatür aralığı örnekten) — raporda açıkça yazılır. */
  function raporBolum(ad, d, tr) {
    tr = tr || (x => x); const e = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tb = (b, R) => `<table><tr>${b.map(x => `<th>${e(tr(x))}</th>`).join('')}</tr>${R.map(r => `<tr>${r.map(x => `<td>${e(x)}</td>`).join('')}</tr>`).join('')}</table>`, M0 = d.motor || [], K0 = d.kablo || [], B = d.bhak, T0 = d.topraklama;
    const H3 = t => '<h3>' + e(tr(t)) + '</h3>', Pp = t => '<p>' + e(t) + '</p>';
    let no = 0; const NB = t => '<h3>' + (++no) + '. ' + e(tr(t)) + '</h3>';
    let h = '<h2>' + e(ad) + '</h2>' + NB('Motorlar ve güç kablosu kesiti') + Pp('In = P / (√3 · ' + KAT.U + ' · cosφ · η), cosφ = ' + vir(KAT.cos) + ', η = ' + vir(KAT.eta) + '. ' + tr('Koşul') + ': Iz · ' + vir(KAT.grup) + ' ≥ ' + vir(KAT.emn) + ' · In.');
    h += tb(['Ekipman', 'Tür', 'P (kW)', 'In (A)', 'Gerekli Iz (A)', 'Kesit', 'Iz (A)', 'Sonuç'], M0.map(m => { const q = kesitSec(m.In); return [m.kod, tr({ mikser: 'Mikser', kapak: 'Kapak aktüatörü', vinc: 'Pergel vinç', motor: 'Motor' }[m.tur] || m.tur), m.P != null ? vir(m.P) : '-', m.P != null ? vir(m.In) : '-', m.P != null ? vir(q.gerekli) : '-', cins(4, m.S), vir(q.Iz, 1), m.P == null ? tr('güç verisi yok') : q.Iz >= q.gerekli ? tr('uygun') : tr('uygun değil')]; }));
    const kW = M0.reduce((t, m) => t + (m.P || 0), 0); h += '<p><b>' + e(tr('Kurulu motor gücü')) + ': ' + vir(kW) + ' kW</b></p>';
    if ((d.enstruman || []).length) h += NB('Enstrümanlar') + tb(['Kod', 'Tanım', 'Besleme kablosu', 'Sinyal kablosu'], d.enstruman.map(x => { const q = kablolar(x); return [x.kod, tr(x.tanim), q[0].kod + ' · ' + q[0].cins, q[1].kod + ' · ' + q[1].cins]; }));
    h += NB('Kablo listesi');
    h += tb(LISTE_SUTUN.map(c => c.t), listeSatirlari(K0).map(r => r.map((v, i) => (i === r.length - 1 ? tr(v) : v)))) + Pp(tr('Gerilim düşümü kablo boyuyla yapılır; boylar genel kablolamada belirlenecek.')) + NB('Kablo tavası') + Pp(tr('AG ve zayıf akım hatları ayrı tavadan gider; doluluk en çok %40.'));
    h += tb(['Yürüme yolu', 'Hat', 'Tava (GxY)', 'Kablo kesit alanı (mm²)', 'Doluluk'], (d.tava || []).flatMap((t, i) => [['ag', 'AG'], ['zayif', 'Zayıf akım']].filter(q => t && t[q[0]]).map(q => [i + 1, tr(q[1]), t[q[0]].ad, vir(t[q[0]].A, 0), '%' + vir(t[q[0]].dolu * 100, 0)])));
    if (d.metraj) { h += NB('Tava metrajı ve ek parçalar') + tb(['Malzeme', 'Özellik', 'Birim', 'Miktar'], d.metraj.parcalar.map(x => [tr(x.ad), tr(x.oz), tr(x.birim), x.miktar]).concat(((d.boruMet || {}).boru || []).map(q => [tr('Galvaniz boru (branş)'), q.boru, 'm', vir(q.L)]))); }
    if (B) { h += NB('BHAK anahtar kutusu') + Pp(tr('Kurulu güç') + ' ' + B.kurulu + ' W · Ik = ' + vir(B.Ik) + ' A · ' + tr('ana şalter') + ' 3x' + B.In + ' A · ' + B.kod + ' ' + B.kablo + ' (Iz ' + B.Iz + ' A)'); h += tb(['Çıkış', 'Açıklama', 'Sigorta', 'Kablo', 'Güç (W)'], B.cik.map(c => [c.no, tr(c.aciklama), (c.faz === 3 ? '3x' : '') + c.In + ' A', c.kablo || '-', c.W || '-'])); }
    if (d.arm) h += NB('Aydınlatma') + Pp((d.arm || 0) + ' x ' + (d.armKod || '') + '. ' + tr('Armatür aralığı örnek projeden alınmıştır; aydınlık düzeyi hesabı yapılmamıştır.'));
    if (T0) h += NB('Topraklama') + tb(['ρ (Ωm)', 'D (m)', 'Rh (Ω)', 'Rç (Ω)', 'Çubuk', 'R (Ω)', 'Dokunma (V)', 'Şerit (m)', 'Sonuç'], [[vir(T0.rho, 0), vir(T0.D), vir(T0.Rh), vir(T0.Rc1), T0.cubuk, vir(T0.R), vir(T0.dokunma), vir(T0.serit, 0), T0.uygun ? tr('uygun') : tr('uygun değil')]]);
    return h;
  }

  /* havuzda aydınlatma, priz ve anahtar kutusu: proje ayarı, kapalı başlar (kullanıcı 21.11.2026: "aydınlatma priz anahtar bu projede olmaz"); ELUNITEAYD ile açılır */
  const aydinlatmaVar = set => !!(set && set.elUniteAyd === true);
  const binaVarMi = (ents, havuzId) => (ents || []).some(e => !e.gv && (e.type === 'mtmahal' || (e.type === 'perde' && !e.temel && (e.pts || []).length > 1 && !(e.bag != null && havuzId && havuzId.has(e.bag)))));

  const api = { tavada, TAVA, tavaOlcu, hatSinif, enstrumanlar, aydinlatmaVar, binaVarMi, raporBolum, KAT, NYY_HAVA, NYY_TOPRAK, SIGORTA, akim, kesitSec, cins, motorlar, kablolar, kabloListesi, BORU_TABLO, boruSec, disCap, tavaSec, bhak, armaturYerleri, linyeSay, otele, alan, cevre, cubukYerleri, yapiTuru, etiketSatir, LISTE_SUTUN, listeSatirlari, vir };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!C || !C.addCommand || !C.T || !C.prim) return;
  C.elUniteApi = api;

  /* ======================= NESNELER ======================= */
  const M = C.M, T = C.T, { L, P, CI, TX, S } = C.prim, EL = () => C.EL || {};
  const KR = () => (C.cizimKural && C.cizimKural.ELEKTRIK) || {}, UK = () => KR().unite || {};
  const YR = () => KR().yaziRenk || 7;
  const mmU = k => ((UK().yaziMm || {})[k]) || 2;
  const sb = k => ((((UK().sembol) || {})[k]) || 10) / 100 * ((+C.doc.set.anno || 50) / 50); // model cm (1/50) → m, açıklama ölçeğiyle
  const h_ = k => C.annoH(mmU(k));
  const LY = { baca: 'ELK_BACA', galeri: 'ELK_BACA', tava: 'ELK_TAVA', guc: 'ELK_GUC', kum: 'ELK_KUMANDA', lk: 'ELK_KUMANDA', guc2: 'ELK_GUC2', kum2: 'ELK_KUMANDA2', enst: 'ELK_KUMANDA', top: 'TOPILET', bag: 'TOPILET', ayd: 'EHAT', priz: 'EHAT', mcc: 'ELK_GUC' };
  const lay = n => { const t = KR().katmanlar && KR().katmanlar[n]; if (t) C.ensureLayer(n, t.renk, String(t.tip).toUpperCase(), Math.round(t.kal * 100)); else C.ensureLayer(n, 7, 'CONTINUOUS', 25); return n; };
  const okunur = a => { let r = a; while (r > Math.PI / 2 + 1e-6) r -= Math.PI; while (r < -Math.PI / 2 - 1e-6) r += Math.PI; return r; };
  const yz = (p, h, s, rot, al, o) => TX(p, h, s, rot || 0, al || 'L', Object.assign({ color: YR(), st: 'AAAA' }, o || {}));
  const mask = pr => (EL().maskele ? EL().maskele(pr) : pr);
  const kutu = (c, w, hh, ang) => { const u = [Math.cos(ang || 0), Math.sin(ang || 0)], n = [-u[1], u[0]], q = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, 0]; return { q, pts: [q(-w / 2, -hh / 2), q(w / 2, -hh / 2), q(w / 2, hh / 2), q(-w / 2, hh / 2)] }; };

  const SEMBOL = {
    motor: e => { const r = sb('motorR'), c = e.p, out = [CI([c[0], c[1], 0], r), TX([c[0], c[1] + r * 0.12, 0], r * 0.62, 'M', 0, 'BC', { color: YR(), st: 'AAAA' }), TX([c[0], c[1] - r * 0.08, 0], r * 0.5, '3~', 0, 'TC', { color: YR(), st: 'AAAA' })];
      const h = h_('kod'); out.push(yz([c[0] + r * 1.25, c[1] + h * 0.3, 0], h, e.kod || '', 0, 'BL')); if (e.P != null) out.push(yz([c[0] + r * 1.25, c[1] - h * 0.3, 0], h, `${vir(e.P)} kW`, 0, 'TL'));
      return out; },
    orp: e => { const r = sb('motorR'), c = e.p, h = h_('kod'); return [CI([c[0], c[1], 0], r), TX([c[0], c[1], 0], r * 0.55, 'ORP', 0, 'MC', { color: YR(), st: 'AAAA' }), yz([c[0] + r * 1.25, c[1], 0], h, e.kod || '', 0, 'ML')]; },
    baca: e => { const Bc = UK().baca || { dis: 1, ic: 0.8 }, d = Bc.dis, i = Bc.ic, A0 = kutu(e.p, d, d, e.ang), I0 = kutu(e.p, i, i, e.ang), h = h_('kod'), r = d / 2 + h * 0.5; return [P(A0.pts, true, { color: 1 }), P(I0.pts, true, { color: 1, lt: 'HIDDEN' }), yz([e.p[0] + r, e.p[1] + h * 0.8, 0], h, e.kod || 'KB', 0, 'BL'), yz([e.p[0] + r, e.p[1] - h * 0.8, 0], h, '4xØ100 PVC BORU', 0, 'TL')]; },
    jb: e => { const w = sb('jb'), K = kutu(e.p, w, w, e.ang), h = h_('kutu'); return [P(K.pts, true), yz([e.p[0] - w * 0.8, e.p[1] + w * 0.3, 0], h, `JB-${e.kod}`, 0, 'BR')]; }, /* etiket yatay (örnekte 7,5 birim, 1,5 mm) */
    lcu: e => { const w = sb('lcu'), K = kutu(e.p, w, w, e.ang), h = h_('kutu'); return [P(K.pts, true), L(K.pts[0], K.pts[2]), S([K.pts[0], K.pts[1], K.pts[2]]), yz([e.p[0] + w * 0.8, e.p[1] - w * 0.3, 0], h, `LCU-${e.kod}`, 0, 'TL')]; },
    arm: e => { /* korkuluğa monte etanş armatür (E-BP 003 sembolü): direk kolu + üçgen başlık; yanında armatür kodu, linye no */
      const a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = e.on || [-u[1], u[0]], Lb = sb('armaturBoy') * 0.6, w = sb('armaturEn'), c = e.p, q = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, 0];
      const h = h_('kod'), out = [L(q(0, 0), q(0, Lb * 0.55)), S([q(0, Lb * 0.55), q(-w, Lb * 1.05), q(w, Lb * 1.05)]), P([q(0, Lb * 0.55), q(-w, Lb * 1.05), q(w, Lb * 1.05)], true)];
      out.push(yz(q(w * 1.6, Lb * 0.8), h, e.kod || 'U-LED36W', okunur(a + Math.PI / 2), 'ML')); if (e.linye) out.push(TX(q(-w * 1.8, Lb * 0.8), h, String(e.linye), 0, 'MC', { color: YR(), st: 'elk' }));
      return out; },
    bhak: e => { const w = sb('bhak'), K = kutu(e.p, w * 0.7, w, e.ang), h = h_('kod'); return [P(K.pts, true), P([K.q(w * 0.08, w * 0.38), K.q(-w * 0.12, 0), K.q(w * 0.12, 0), K.q(-w * 0.08, -w * 0.38)], false), yz([e.p[0] + w * 0.5, e.p[1], 0], h, 'BHAK', 0, 'ML')]; },
    prizp: e => { const w = sb('prizPano'), K = kutu(e.p, w, w * 0.6, e.ang), h = h_('kod'), r = w * 0.16; const out = [P(K.pts, true)];
      for (const s of [-w * 0.22, w * 0.22]) { const c0 = K.q(s, -w * 0.05); const pts = []; for (let i = 0; i <= 10; i++) { const t = Math.PI * i / 10; pts.push([c0[0] + r * Math.cos(t), c0[1] + r * Math.sin(t), 0]); } out.push(P(pts, false), L([c0[0] - r, c0[1], 0], [c0[0] + r, c0[1], 0])); }
      out.push(yz([e.p[0] + w * 0.7, e.p[1], 0], h, `3Ø PRİZ PANOSU ${e.kod || ''}`.trim(), 0, 'ML')); return out; },
    te: e => { const r = sb('cubukR'), c = e.p, h = h_('kod'); return [CI([c[0], c[1], 0], r), L([c[0] - r * 0.7, c[1] - r * 0.7, 0], [c[0] + r * 0.7, c[1] + r * 0.7, 0]), L([c[0] - r * 0.7, c[1] + r * 0.7, 0], [c[0] + r * 0.7, c[1] - r * 0.7, 0]), yz([c[0] + r * 1.3, c[1] + r * 0.3, 0], h, e.kod || 'TE', 0, 'BL')]; },
    tb: e => { const w = sb('bara'), hh = w * 0.24, K = kutu(e.p, w, hh, e.ang), h = h_('kod'); return [S(K.pts), P(K.pts, true), yz(K.q(0, hh / 2 + h * 0.6), h, e.kod || 'TB-1', okunur(e.ang || 0), 'BC')]; },
    mcc: e => { /* MCC yönü: ok + yazı (yeri ve boy genel kablolamada) */
      const a = e.ang || 0, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]], c = e.p, h = h_('mcc'), q = (s, o) => [c[0] + u[0] * s + n[0] * o, c[1] + u[1] * s + n[1] * o, 0], k = h * 0.9;
      const ters = u[0] < -1e-6, sg = ters ? -1 : 1; return [S([q(0, 0), q(-k * 1.6, k * 0.6), q(-k * 1.6, -k * 0.6)]), yz(q(k * 0.6, sg * h * 0.15), h, e.kod || 'MCC-1 PANOSUNA', okunur(a), ters ? 'BR' : 'BL'), yz(q(k * 0.6, -sg * h * 0.35), h * 0.5, '(yeri ve kablo boyları genel yerleşim / genel kablolamada)', okunur(a), ters ? 'TR' : 'TL')]; },
    etk: e => { /* kablo etiketi bloğu: satırlar alt alta, ilk satırın altı çizili; ok ucu q'dan eğik çizgi + yatay çizgi (örnek) */
      const h = h_('kablo'), sat = e.satir || [], c = e.p, gap = h * 1.55, w = Math.max(1, ...sat.map(s => String(s).length)) * h * 0.62, out = [];
      sat.forEach((s, i) => out.push(yz([c[0], c[1] - i * gap, 0], h, s, 0, 'BL')));
      const yA = c[1] - h * 0.35; out.push(L([c[0] - h * 0.3, yA, 0], [c[0] + w, yA, 0]));
      if (e.q) out.push(L([e.q[0], e.q[1], 0], [c[0] - h * 0.3, yA, 0]));
      return out; },
  };
  const AD = { baca: 'Kablo bacası', orp: 'Redoks metre (ORP)', motor: 'Elektrik motoru', jb: 'Junction box', lcu: 'Saha lokal kumanda panosu', arm: 'Korkuluğa monte LED etanş armatür', bhak: 'Etanş anahtar kutusu (BHAK)', prizp: '3 fazlı priz panosu', te: 'Topraklama çubuğu', tb: 'Topraklama barası', mcc: 'MCC yönü', etk: 'Kablo etiketi' };
  const yeniYazi = s => String(s);
  T.eluc = {
    label: 'Ünite elektrik elemanı',
    prims: e => { try { const pr = (SEMBOL[e.kind] || SEMBOL.jb)(e); return e.kind === 'motor' || e.kind === 'te' ? pr : mask(pr); } catch (er) { console.error(er); return []; } },
    snaps: e => [{ p: [e.p[0], e.p[1], 0], k: 'ins' }],
    xf: (e, X) => { const q = X.p([e.p[0], e.p[1], 0]), q2 = X.p([e.p[0] + Math.cos(e.ang || 0), e.p[1] + Math.sin(e.ang || 0), 0]); e.p = [q[0], q[1]]; e.ang = Math.atan2(q2[1] - q[1], q2[0] - q[0]); if (e.q) { const r = X.p([e.q[0], e.q[1], 0]); e.q = [r[0], r[1]]; } if (e.on) { const o0 = X.p([0, 0, 0]), o1 = X.p([e.on[0], e.on[1], 0]); e.on = [o1[0] - o0[0], o1[1] - o0[1]]; } },
    info: e => `${AD[e.kind] || e.kind}${e.kod ? ' ' + yeniYazi(e.kod) : ''}${e.P != null ? ' · ' + vir(e.P) + ' kW' : ''}`,
  };
  T.eluh = {
    label: 'Ünite elektrik hattı',
    prims: e => { const out = [], pts = (e.pts || []).map(p => [p[0], p[1], 0]); if (pts.length < 2) return out;
      if (e.sys === 'galeri') { const w = (+e.w || 1.5), h = h_('kod'), a = pts[0], b = pts[pts.length - 1], ang = okunur(Math.atan2(b[1] - a[1], b[0] - a[0])), nx = -Math.sin(ang), ny = Math.cos(ang); for (const o of [-w / 2, w / 2]) out.push(P(ofsetCizgi(pts, o), false)); const q = (t, o) => [a[0] + (b[0] - a[0]) * t + nx * o, a[1] + (b[1] - a[1]) * t + ny * o, 0]; out.push(L(q(0, -w / 2), q(0, w / 2)), P([q(1, -w / 2 - 0.1), q(1, -w * 0.12), q(0.96, 0), q(1.04, w * 0.08), q(1, w * 0.14), q(1, w / 2 + 0.1)], false), yz(q(0.5, h * 0.7), h, e.kod || 'KABLO GALERİSİ', ang, 'BC'), yz(q(0.5, -h * 0.7), h * 0.8, '(GENEL YERLEŞİME GÖRE)', ang, 'TC')); return mask(out); }
      if (e.sys === 'tava') { const w = (+e.w || 100) / 1000, nn = e.n || 1, h = h_('tava');
        for (let k = 0; k < nn; k++) { const c0 = (k - (nn - 1) / 2) * (w + 0.05); for (const o of [c0 - w / 2, c0 + w / 2]) out.push(P(ofsetCizgi(pts, o), false)); }
        let bi = 1, bl = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (l > bl) { bl = l; bi = i; } }
        const a = pts[bi - 1], b = pts[bi], ang = okunur(Math.atan2(b[1] - a[1], b[0] - a[0])), nx = -Math.sin(ang), ny = Math.cos(ang), D0 = e.dis || [nx, ny], yan = nx * D0[0] + ny * D0[1] >= 0 ? 1 : -1, sira = e.sinif === 'zayif' ? 1 : 0, of = yan * (nn * w / 2 + h * (0.7 + sira * 1.7)) - (yan < 0 ? h : 0), m = [(a[0] + b[0]) / 2 + nx * of, (a[1] + b[1]) / 2 + ny * of, 0];
        out.push(yz(m, h, `${e.kod || ''} ${e.el || ''}`.trim(), ang, 'BC'));
        return mask(out); }
      out.push(P(pts, false));
      if ((e.sys === 'top' || e.sys === 'ayd' || e.sys === 'priz' || e.sys === 'bag') && e.cins) { let bi = 1, bl = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (l > bl) { bl = l; bi = i; } }
        const a = pts[bi - 1], b = pts[bi], h = h_('kablo'), ang = okunur(Math.atan2(b[1] - a[1], b[0] - a[0])), nx = -Math.sin(ang), ny = Math.cos(ang); if (bl > h * 8) out.push(yz([(a[0] + b[0]) / 2 + nx * h * 0.7, (a[1] + b[1]) / 2 + ny * h * 0.7, 0], h, e.cins, ang, 'BC')); return mask(out); }
      return out; },
    snaps: e => (e.pts || []).map(p => ({ p: [p[0], p[1], 0], k: 'end' })),
    xf: (e, X) => { e.pts = (e.pts || []).map(p => X.p([p[0], p[1], 0]).slice(0, 2)); },
    info: e => `${({ tava: 'Kablo tavası', guc: 'Güç kablosu', kum: 'Kumanda kablosu', lk: 'Lokal kumanda kablosu', guc2: 'Güç kablosu (2. kademe)', kum2: 'Kumanda kablosu (2. kademe)', enst: 'Enstrüman kablosu', top: 'Topraklama iletkeni', bag: 'Topraklama bağlantısı', ayd: 'Işık linyesi', priz: 'Priz panosu beslemesi', mcc: 'MCC kablo demeti' })[e.sys] || 'Hat'}${e.kod ? ' ' + e.kod : ''}${e.cins ? ' · ' + e.cins : ''}${e.sys !== 'tava' && e.sys !== 'top' && e.sys !== 'bag' ? ' · boy: ' + (e.boy != null ? Math.round(e.boy) + ' m' : 'genel kablolamada') : ''}`,
  };
  function ofsetCizgi(pts, o) { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; out.push([pts[i][0] + n[0] * o, pts[i][1] + n[1] * o, 0]); } return out; }
  if (C.ANNO_TYPES && C.ANNO_TYPES.add) { C.ANNO_TYPES.add('eluc'); C.ANNO_TYPES.add('eluh'); }
  T.eluc.ifc = 'IfcFlowTerminal'; T.eluh.ifc = 'IfcCableCarrierSegment';
  /* disiplin: ünite elektrik nesneleri ELEKTRIK kategorisinde (pafta penceresi ve 3B disiplin seçimi) */
  { const k0 = C.gorunumKategori; C.gorunumKategori = e => { if (e && /^elu[ch]$/.test(e.type)) return 'ELEKTRIK'; return k0 ? k0(e) : null; }; }

  /* ======================= 3B ======================= */
  const G3 = () => C.MT && C.MT._g3, ins = () => C._ins;
  const GALV = [0.66, 0.68, 0.7], GRI = [0.72, 0.74, 0.76], KOYU = [0.25, 0.26, 0.28], MAVI = [0.2, 0.35, 0.85], YESIL = [0.15, 0.65, 0.3], BAK = [0.78, 0.45, 0.2], ISIK = [1, 0.98, 0.82], TURU = [0.93, 0.55, 0.2];
  const mesh = fn => e => { if (e.gv) return []; const I = ins(); if (!I || !G3()) return []; const out = I.newMesh(); try { fn(e, out); } catch (er) { console.error(er); return []; } return out.v.length ? [out] : []; };
  T.eluc.mesh = mesh((e, out) => { const { eksen, bx, sil } = G3(), z = +e.z || 0, F = eksen(e.p, e.ang || 0, e.on || null);
    switch (e.kind) {
      case 'orp': bx(out, F, -0.1, 0.1, -0.06, 0.06, z + 0.9, z + 1.15, GRI); sil(out, [e.p[0], e.p[1], z - 2], [0, 0, 1], 0.02, 2.9, GALV, 10); break;
      case 'baca': { const Bc = UK().baca || { dis: 1, ic: 0.8, h: 1.2 }, D = Bc.dis / 2, I = Bc.ic / 2, zA = z - Bc.h; bx(out, F, -D, D, -D, -I, zA, z, GRI); bx(out, F, -D, D, I, D, zA, z, GRI); bx(out, F, -D, -I, -I, I, zA, z, GRI); bx(out, F, I, D, -I, I, zA, z, GRI); bx(out, F, -D, D, -D, D, zA - 0.1, zA, GRI); break; }
      case 'jb': bx(out, F, -0.08, 0.08, -0.05, 0.05, z + 0.5, z + 0.66, GRI); break;
      case 'lcu': sil(out, [e.p[0], e.p[1], z], [0, 0, 1], 0.03, 0.8, GALV, 10); bx(out, F, -0.2, 0.2, -0.1, 0.1, z + 0.8, z + 1.3, GRI); bx(out, F, -0.05, 0.05, 0.1, 0.105, z + 1.0, z + 1.1, [0.85, 0.15, 0.12]); break;
      case 'arm': { const n = e.on || F.n; sil(out, [e.p[0], e.p[1], z], [0, 0, 1], 0.044, +e.H || 3.5, GALV, 12); const Fa = eksen([e.p[0] + n[0] * 0.15, e.p[1] + n[1] * 0.15], e.ang || 0, null); bx(out, Fa, -0.635, 0.635, -0.045, 0.045, z + (+e.H || 3.5) - 0.02, z + (+e.H || 3.5) + 0.06, GRI); bx(out, Fa, -0.6, 0.6, -0.035, 0.035, z + (+e.H || 3.5) - 0.025, z + (+e.H || 3.5) - 0.02, ISIK); break; }
      case 'bhak': bx(out, F, -0.15, 0.15, -0.07, 0.07, z + 1.0, z + 1.35, GRI); break;
      case 'prizp': bx(out, F, -0.18, 0.18, -0.08, 0.08, z + 0.7, z + 1.15, TURU); break;
      case 'te': sil(out, [e.p[0], e.p[1], z - 3], [0, 0, 1], 0.01, 3, BAK, 10); sil(out, [e.p[0], e.p[1], z - 0.12], [0, 0, 1], 0.04, 0.12, GALV, 10); break;
      case 'tb': bx(out, F, -0.2, 0.2, 0, 0.005, z + 0.3, z + 0.34, BAK); bx(out, F, -0.23, 0.23, -0.004, 0, z + 0.24, z + 0.4, GRI); break;
    } });
  T.eluh.mesh = mesh((e, out) => { const { eksen, bx, sil } = G3(), z = +e.z || 0, pts = e.pts || [];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.01) continue; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), F = eksen([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang, null);
      if (e.sys === 'galeri') { const w = (+e.w || 1.5) / 2, hG = +e.h || 2, zA = z - hG; bx(out, F, -l / 2, l / 2, -w - 0.2, w + 0.2, zA - 0.2, zA, GRI); bx(out, F, -l / 2, l / 2, -w - 0.2, -w, zA, z, GRI); bx(out, F, -l / 2, l / 2, w, w + 0.2, zA, z, GRI); }
      else if (e.sys === 'tava') { const w = (+e.w || 100) / 1000, hT = (+e.h || 60) / 1000, nn = e.n || 1; for (let k = 0; k < nn; k++) { const c0 = (k - (nn - 1) / 2) * (w + 0.05), o0 = c0 - w / 2, o1 = c0 + w / 2; bx(out, F, -l / 2, l / 2, o0, o1, z, z + 0.003, GALV); bx(out, F, -l / 2, l / 2, o0, o0 + 0.002, z, z + hT, GALV); bx(out, F, -l / 2, l / 2, o1 - 0.002, o1, z, z + hT, GALV); } }
      else if (e.sys === 'top' || e.sys === 'bag') bx(out, F, -l / 2 - 0.004, l / 2 + 0.004, -0.015, 0.015, z, z + 0.0035, e.sys === 'bag' ? BAK : GALV);
      else { const col = /^kum|^lk|^enst/.test(e.sys) ? YESIL : e.sys === 'ayd' || e.sys === 'priz' ? [0.25, 0.65, 0.9] : MAVI; sil(out, [a[0], a[1], z + 0.02], [(b[0] - a[0]) / l, (b[1] - a[1]) / l, 0], 0.008, l, col, 8); } } });

  /* ======================= YERLEŞİM (model nesneleri) ======================= */
  const durum = () => (C.doc.set.elUnite = C.doc.set.elUnite || {});
  const tarifli = e => !!(e && C.T[e.type] && C.T[e.type].paftaTarifi);
  const havuzMu = e => !!e && !e.gv && yapiTuru(e) === 'havuz' && (tarifli(e) || e.type === 'unite');
  const ctxOf = () => ({
    deger: e => (C.aileDegerE ? C.aileDegerE(e) : e.par || {}),
    aktuator: q => (C.aktuator ? C.aktuator.penstokAktuator({ B: q.B, H: q.H, hw: q.hw, G: q.G, mil: q.mil }) : null),
    mikserModel: k => (C.mikserModel && C.mikserModel[k]) || null,
    vincModel: q => { const V = q && q.model && C.PERGEL_VINC_VERI && C.PERGEL_VINC_VERI[q.model]; return V ? { H: V.H, uc: V.uc } : null; },
    korkulukAd: km => (C.KORKULUK_KM && C.KORKULUK_KM[km] ? C.KORKULUK_KM[km][0] : km),
    aile: fam => (C.AILELER && C.AILELER[fam]) || null,
  });
  const ekipman = u => C.doc.ents.filter(x => !x.gv && x.bag === u.id && x.type === 'aile');
  const sil_ = u => { C.doc.ents = C.doc.ents.filter(e => !(e.elu === u.id && !e.gv && (e.type === 'eluc' || e.type === 'eluh'))); };
  const ekle = (type, props) => { const e = C.add(C.newEnt(type, props)); if (e) delete e.sp; return e; };
  const proj = (p, o, u) => (p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1];

  /* köprü ekseni: korkuluk noktalarının en uzun kenar doğrultusu; tava bu eksende, korkuluk noktalarının izdüşüm aralığında */
  function kopruEkseni(korkuluk) {
    const P0 = korkuluk.pts || []; let bl = -1, u = [1, 0];
    for (let i = 1; i < P0.length; i++) { const l = Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]); if (l > bl) { bl = l; u = [(P0[i][0] - P0[i - 1][0]) / l, (P0[i][1] - P0[i - 1][1]) / l]; } }
    const c = [P0.reduce((s, p) => s + p[0], 0) / P0.length, P0.reduce((s, p) => s + p[1], 0) / P0.length], n = [-u[1], u[0]];
    const ss = P0.map(p => proj(p, c, u)), oo = P0.map(p => proj(p, c, n));
    return { u, n, c, s0: Math.min(...ss), s1: Math.max(...ss), o0: Math.min(...oo), o1: Math.max(...oo), z: +((P0[0] || [])[2] || 0) };
  }

  function yerlestir(u) {
    sil_(u); for (const k of Object.values(LY)) lay(k); lay('EYAZI'); lay('ELK_TAVA_Z'); lay('ELK_BACA');
    const ctx = ctxOf(), U = C.uniteMekanikApi, E = ekipman(u);
    const kal = U ? E.map(x => { const k = U.kalem(x, ctx); if (k) { k.e = x; k.kod = x.ad || k.kod; } return k; }).filter(Boolean) : [];
    const MS = motorlar(kal), byKod = new Map(kal.map(k => [k.kod, k.e]));
    const kork = C.doc.ents.filter(x => !x.gv && x.bag === u.id && x.type === 'korkuluk'), kopKork = kork.filter(k => /kopru/.test(String(k.anahtar || ''))), merd = C.doc.ents.filter(x => !x.gv && x.bag === u.id && x.type === 'merdiven');
    const tret = C.doc.ents.find(x => !x.gv && x.bag === u.id && x.type === 'tretuvar');
    const KK = (kopKork.length ? kopKork : kork).filter(k => (k.pts || []).length > 2);
    let bb = null; try { delete u._c; bb = C.bbox(u); } catch (er) { }
    const uyar = [];
    if (!KK.length) uyar.push('Ünitede yürüme yolu korkuluğu yok: kablo tavası ünite ortasından geçirildi (önce ANAEKIPMAN).');
    const eksenler = KK.length ? KK.map(kopruEkseni) : [{ u: [1, 0], n: [0, 1], c: bb ? [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2] : [0, 0], s0: bb ? -(bb[2] - bb[0]) / 2 + 1 : -5, s1: bb ? (bb[2] - bb[0]) / 2 - 1 : 5, o0: -1, o1: 1, z: +u.zt || 0 }];
    const zYol = Math.max(...eksenler.map(a => a.z)), zDuv = isFinite(+u.zt) ? +u.zt : zYol - 0.2, zTava = zDuv - (UK().tavaAlt || 0.82);
    const zZemin = tret && isFinite(+tret.zg) ? +tret.zg : (merd[0] ? Math.min(+merd[0].z0 || 0, +merd[0].z1 || 0) : zDuv - 2.25);
    const elYaz = z => `EL ${z >= 0 ? '+' : ''}${(+z).toFixed(2)}`;
    /* --- tava güzergâhları: her köprünün ekseninde */
    /* tava yürüme yolunun dış kenarında (yürüme alanına girmez), ekipmanı az olan kenar (kullanıcı 21.11.2026) */
    const TY = C.elTavaApi, tavalar = eksenler.map((a, i) => { const m = 0.3, Kn0 = TY && KK[i] ? TY.yolKenar(KK[i].pts, a) : {}, Kn = { oA: Kn0.oA != null ? Kn0.oA : a.o0, oB: Kn0.oB != null ? Kn0.oB : a.o1 }, ek = E.filter(x => { const q = proj(x.p, a.c, a.u); return q >= a.s0 - 0.5 && q <= a.s1 + 0.5; }).map(x => proj(x.p, a.c, a.n)), Y = TY ? TY.tavaYani(Kn, ek) : { o: Kn.oB, sg: 1, oDiger: Kn.oA }, nk = (sv, o) => [a.c[0] + a.u[0] * sv + a.n[0] * o, a.c[1] + a.u[1] * sv + a.n[1] * o], A = nk(a.s0 + m, Y.o), B = nk(a.s1 - m, Y.o); return { a, A, B, i, kablolar: [], Kn, Y, dis: [a.n[0] * Y.sg, a.n[1] * Y.sg] }; });
    const tavaNokta = p => { let best = null; for (const t of tavalar) { const L0 = Math.hypot(t.B[0] - t.A[0], t.B[1] - t.A[1]) || 1, uu = [(t.B[0] - t.A[0]) / L0, (t.B[1] - t.A[1]) / L0]; const s = Math.max(0, Math.min(L0, proj(p, t.A, uu))), q = [t.A[0] + uu[0] * s, t.A[1] + uu[1] * s], d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || d < best.d) best = { t, q, d, uu, s }; } return best; };
    /* --- her yürüme yolunun kendi merdiveni: kablolar tavanın merdiven başına yakın ucundan merdivenle zemine iner (MCC yönü) */
    const segD = (p, A, B) => { const L0 = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, t = Math.max(0, Math.min(1, ((p[0] - A[0]) * (B[0] - A[0]) + (p[1] - A[1]) * (B[1] - A[1])) / (L0 * L0))); return Math.hypot(p[0] - A[0] - (B[0] - A[0]) * t, p[1] - A[1] - (B[1] - A[1]) * t); };
    for (const t of tavalar) { let bm = null, bd = Infinity; for (const m of merd) { const q = m.pts[m.pts.length - 1], d = segD(q, t.A, t.B); if (d < bd) { bd = d; bm = m; } }
      t.mTop = bm ? bm.pts[bm.pts.length - 1] : null; t.mBot = bm ? bm.pts[0] : null;
      const dA = t.mTop ? Math.hypot(t.A[0] - t.mTop[0], t.A[1] - t.mTop[1]) : 0, dB = t.mTop ? Math.hypot(t.B[0] - t.mTop[0], t.B[1] - t.mTop[1]) : 1; t.uc = dA <= dB ? t.A : t.B; }
    const cikis = tavalar.length ? { t: tavalar[0], q: tavalar[0].uc } : null, mTop = cikis && cikis.t.mTop, mBot = cikis && cikis.t.mBot;
    /* --- motorlar ve kabloları */
    const KL = [], etk = [], sp = (C.doc.set.anno || 50) / 50;
    for (const m of MS) {
      const x = byKod.get(m.kod); if (!x) continue; const p = [x.p[0], x.p[1]], tn = tavaNokta(p); if (!tn) continue; const t = tn.t, n = [-(tn.uu[1]), tn.uu[0]], yon = proj(p, tn.q, n) >= 0 ? 1 : -1;
      const KB = kablolar(m); KL.push(...KB); t.kablolar.push(...KB);
      const zEk = +x.z || zDuv;
      ekle('eluc', { kind: 'motor', p, kod: m.kod, P: m.P, z: zEk, elu: u.id, layer: 'EYAZI' });
      const dOff = i => [tn.uu[0] * (i - 1) * 0.05 * sp, tn.uu[1] * (i - 1) * 0.05 * sp]; // aynı ekipmanın kabloları yan yana
      /* güzergâh: tava noktasından tava boyunca (gerekirse) ekipman hizasına, oradan dik olarak ekipmana */
      const yolA = (a, b, i) => { const o = dOff(i), A0 = [a[0] + o[0], a[1] + o[1]], d = proj(b, A0, tn.uu); return Math.abs(d) < 0.02 ? [A0, b] : [A0, [A0[0] + tn.uu[0] * d, A0[1] + tn.uu[1] * d], b]; };
      if (m.tur === 'mikser') {
        const a1 = t.a, oM = proj(p, a1.c, a1.n), oE = Math.abs(oM - t.Kn.oA) < Math.abs(oM - t.Kn.oB) ? t.Kn.oA : t.Kn.oB, sM = proj(p, a1.c, a1.u), kn = sv => [a1.c[0] + a1.u[0] * sv + a1.n[0] * oE, a1.c[1] + a1.u[1] * sv + a1.n[1] * oE], jb = kn(sM), lcu = kn(sM + (sM + 0.7 * sp <= a1.s1 - 0.2 ? 0.7 : -0.7) * sp), ang = Math.atan2(tn.uu[1], tn.uu[0]); /* korkuluk hattında: yürüme alanını kapatmaz */
        ekle('eluc', { kind: 'jb', p: jb, ang, kod: m.kod, z: zYol, elu: u.id, layer: 'EYAZI' }); ekle('eluc', { kind: 'lcu', p: lcu, ang, kod: m.kod, z: zYol, elu: u.id, layer: 'EYAZI' });
        const lkK = KB.find(k => k.tur === 'lk'), gK = KB.find(k => k.tur === 'guc2'), kK = KB.find(k => k.tur === 'kum2');
        ekle('eluh', { sys: 'lk', pts: yolA([tn.q[0], tn.q[1]], lcu, 0), z: zTava, kod: lkK.kod, cins: lkK.cins, boy: null, elu: u.id, layer: LY.lk });
        ekle('eluh', { sys: 'guc2', pts: [lcu, jb, p], z: zYol, kod: gK.kod, cins: gK.cins, boy: null, elu: u.id, layer: LY.guc2 });
        ekle('eluh', { sys: 'kum2', pts: [[lcu[0] + tn.uu[0] * 0.05 * sp, lcu[1] + tn.uu[1] * 0.05 * sp], [jb[0] + tn.uu[0] * 0.05 * sp, jb[1] + tn.uu[1] * 0.05 * sp], [p[0] + tn.uu[0] * 0.05 * sp, p[1] + tn.uu[1] * 0.05 * sp]], z: zYol, kod: kK.kod, cins: kK.cins, boy: null, elu: u.id, layer: LY.kum2 });
        etk.push({ hedef: [(lcu[0] + tn.q[0]) / 2, (lcu[1] + tn.q[1]) / 2], satir: etiketSatir(lkK), yon, tn }, { hedef: [(jb[0] + p[0]) / 2, (jb[1] + p[1]) / 2], satir: [...etiketSatir(gK), ...etiketSatir(kK)], yon, tn });
      } else {
        KB.forEach((k, i) => ekle('eluh', { sys: k.tur, pts: yolA([tn.q[0], tn.q[1]], p, i), z: zTava, kod: k.kod, cins: k.cins, boy: null, elu: u.id, layer: LY[k.tur] }));
        etk.push({ hedef: [(tn.q[0] + p[0]) / 2, (tn.q[1] + p[1]) / 2], satir: KB.flatMap(etiketSatir), yon, tn });
      }
    }
    /* --- enstrümanlar: her halkaya bir redoks metre (yürüme yolunun karşı yüzünde, koridor ortasında) */
    const ENS = []; try { const G = C.anaerobikGeo ? C.anaerobikGeo(u) : null, fr = C.frame ? C.frame(u.o, u.rot) : null; if (G && fr && G.halka) { const un = (String(u.code || '').match(/\d+/) || ['000'])[0], q = G.q, L1 = enstrumanlar(un, G.halka.length);
      G.halka.forEach((H, i) => { const m = L1[i], w = fr.at(G.kopru.x1 + 0.95, H.yc - (H.yon || 1) * (q.tw / 2 + G.b / 2), 0), p = [w[0], w[1]], tn = tavaNokta(p); if (!tn) return; const KB = kablolar(m); ENS.push(m); KL.push(...KB); tn.t.kablolar.push(...KB);
        ekle('eluc', { kind: 'orp', p, kod: m.kod, z: zYol, elu: u.id, layer: 'EYAZI' });
        KB.forEach((k, j) => { const o = [tn.uu[0] * (j - 0.5) * 0.05 * sp, tn.uu[1] * (j - 0.5) * 0.05 * sp], A0 = [tn.q[0] + o[0], tn.q[1] + o[1]], d = proj(p, A0, tn.uu); ekle('eluh', { sys: 'enst', pts: Math.abs(d) < 0.02 ? [A0, p] : [A0, [A0[0] + tn.uu[0] * d, A0[1] + tn.uu[1] * d], p], z: zTava, kod: k.kod, cins: k.cins, boy: null, elu: u.id, layer: LY.enst }); });
        etk.push({ hedef: [(tn.q[0] + p[0]) / 2, (tn.q[1] + p[1]) / 2], satir: KB.flatMap(etiketSatir), yon: proj(p, tn.q, [-tn.uu[1], tn.uu[0]]) >= 0 ? 1 : -1, tn }); }); } } catch (er) { console.error('enstrüman', er); }
    if (!ENS.length) uyar.push('Redoks metre yerleştirilemedi (halka bilgisi yok).');
    let girisNo = 0; const girisler = []; /* genel yerleşim bu noktalara galeri / menhol / boru hattını bağlar */
    /* --- tavalar: gerçek ölçü, AG (üstte) ve zayıf akım (altta) ayrı */
    const zAG = zTava + (UK().tavaAra || 0.2);
    for (const t of tavalar) { const ts = tavaSec(t.kablolar); t.sec = ts;
      const kay = q => { const g = ((q.n || 1) * q.w + ((q.n || 1) - 1) * 50) / 2000 + 0.05; return [[t.A[0] + t.dis[0] * g, t.A[1] + t.dis[1] * g], [t.B[0] + t.dis[0] * g, t.B[1] + t.dis[1] * g]]; };
      if (ts.ag) ekle('eluh', { sys: 'tava', sinif: 'ag', dis: t.dis, pts: kay(ts.ag), z: zAG, n: ts.ag.n, w: ts.ag.w, h: ts.ag.h, kod: `AG KABLO TAVASI ${ts.ag.ad}`, el: elYaz(zAG), elu: u.id, layer: LY.tava });
      if (ts.zayif) ekle('eluh', { sys: 'tava', sinif: 'zayif', dis: t.dis, pts: kay(ts.zayif), z: zTava, n: ts.zayif.n, w: ts.zayif.w, h: ts.zayif.h, kod: `ZAYIF AKIM TAVASI ${ts.zayif.ad}`, el: elYaz(zTava), elu: u.id, layer: 'ELK_TAVA_Z' }); }
    for (const t of tavalar) { if (!t.kablolar.some(tavada)) continue; const KLt = t.kablolar.filter(tavada);
      /* kablo girişi (kullanıcı 21.11.2026): tava ucunun hizasında yapı kenarından kablo bacası ya da kablo galerisi */
      const TG = C.elTavaApi, ot = t.uc === t.A ? t.B : t.A, gl = Math.hypot(t.uc[0] - ot[0], t.uc[1] - ot[1]) || 1, gy = [(t.uc[0] - ot[0]) / gl, (t.uc[1] - ot[1]) / gl], disC = tret && tret.pts && tret.pts.length > 2 ? otele(tret.pts.map(p => [p[0], p[1]]), +tret.w || 1) : bb ? [[bb[0], bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [bb[0], bb[3]]] : [], Bc = UK().baca || { dis: 1, ic: 0.8, h: 1.2 }, Gc = UK().galeri || { w: 1.5, h: 2 }, tur = TG ? TG.kabloGiris(C.doc.set) : 'baca', pay = tur === 'galeri' ? 0 : Bc.dis / 2 + 0.2, GY0 = TG ? TG.girisYeri(t.uc, gy, disC, pay) : { kenar: t.uc, merkez: t.uc }, Hd = TG && Array.isArray(u.elGirisHedef) && disC.length > 2 ? TG.hedefGiris(u.elGirisHedef, disC, pay) : null, ilk = !Hd || !girisNo, GY = Hd || GY0, gyS = Hd ? Hd.yon : gy, ang0 = Math.atan2(gyS[1], gyS[0]), noG = ilk ? ++girisNo : girisNo;
      /* hedef varsa tek giriş: tava ucundan yapı kenarına, kenar boyunca girişe (genel yerleşimden gelen hattın tarafı) */
      const yol = Hd ? [t.uc, ...TG.cevreYol(disC, GY0.kenar, Hd.kenar), Hd.merkez] : [t.uc, GY.merkez]; let uc;
      if (tur === 'galeri') { uc = [GY.kenar[0] + gyS[0] * 4, GY.kenar[1] + gyS[1] * 4]; if (ilk) ekle('eluh', { sys: 'galeri', pts: [GY.kenar, uc], z: zZemin, w: Gc.w, h: Gc.h, kod: `KABLO GALERİSİ KG-${noG}`, elu: u.id, layer: LY.galeri }); if (ilk) yol.push(uc); }
      else { if (ilk) ekle('eluc', { kind: 'baca', p: GY.merkez, ang: ang0, kod: `KABLO BACASI KB-${noG}`, z: zZemin, elu: u.id, layer: LY.baca }); uc = [GY.merkez[0] + gyS[0] * 2.2, GY.merkez[1] + gyS[1] * 2.2]; if (ilk) yol.push(uc); }
      if (ilk) girisler.push({ kod: tur === 'galeri' ? `KG-${noG}` : `KB-${noG}`, tur, p: GY.kenar.slice(), merkez: GY.merkez.slice(), yon: gyS.slice(), hedef: Hd ? u.elGirisHedef.slice() : null });
      const dr = gyS, dl = 1;
      const nG = KLt.filter(k => hatSinif(k) === 'ag').length, nK = KLt.length - nG;
      ekle('eluh', { sys: 'mcc', pts: yol, z: zTava, kod: 'MCC-1', cins: `${nG} AG + ${nK} zayıf akım kablosu`, boy: null, elu: u.id, layer: LY.mcc });
      if (ilk) ekle('eluc', { kind: 'mcc', p: [uc[0] + dr[0] / dl * 0.2 * sp, uc[1] + dr[1] / dl * 0.2 * sp], ang: Math.atan2(dr[1], dr[0]), kod: 'MCC-1 PANOSUNA', z: zZemin, elu: u.id, layer: 'EYAZI' });
    }
    /* --- etiketler: hedef noktasının yanında, birbirine değmeyen yer (açgözlü) */
    { const h = C.annoH(mmU('kablo')), r0 = sb('motorR'), kutular = C.doc.ents.filter(e => !e.gv && e.elu === u.id && e.type === 'eluc' && /^(motor|orp|jb|lcu)$/.test(e.kind)).map(e => { const w = String(e.kod || '').length * h * 0.62 + r0 * 1.4; return [e.p[0] - r0 - (e.kind === 'jb' ? w : 0), e.p[1] - r0, e.p[0] + r0 + (e.kind === 'jb' ? 0 : w), e.p[1] + r0]; });
      for (const e of C.doc.ents) { if (e.gv || e.elu !== u.id || e.type !== 'eluh' || e.sys !== 'tava') continue; const a = e.pts[0], b = e.pts[1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], D = String(e.kod || '').length * h * 0.62 / 2 + 4 * h, O = h * 4 + (+e.w || 100) / 1000, y = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]), cx = m[0] + e.dis[0] * O / 2, cy = m[1] + e.dis[1] * O / 2; kutular.push(y ? [cx - O / 2, cy - D, cx + O / 2, cy + D] : [cx - D, cy - O / 2, cx + D, cy + O / 2]); }
      const cak = b => kutular.some(k => !(b[2] < k[0] || b[0] > k[2] || b[3] < k[1] || b[1] > k[3]));
      for (const g of etk) { const w = Math.max(...g.satir.map(s => s.length)) * h * 0.62, hh = g.satir.length * h * 1.55; let yer = null;
        const n = [-(g.tn.uu[1]), g.tn.uu[0]];
        for (let k = 0; k < 120 && !yer; k++) { const s = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * hh * 0.6, ofs = (1.2 + Math.floor(k / 20) * 3) * sp; const c = [g.hedef[0] + g.tn.uu[0] * (s + 0.6 * sp) + n[0] * g.yon * ofs * 0.3, g.hedef[1] + g.tn.uu[1] * (s + 0.6 * sp) + n[1] * g.yon * ofs * 0.3];
          const b = [c[0] - h * 0.4, c[1] - hh, c[0] + w, c[1] + h * 1.2]; if (!cak(b)) { yer = c; kutular.push(b); } }
        if (!yer) { yer = [g.hedef[0] + 1, g.hedef[1] + 1]; }
        ekle('eluc', { kind: 'etk', p: yer, q: g.hedef, satir: g.satir, z: zYol, elu: u.id, layer: 'EYAZI' }); } }

    /* --- TOPRAKLAMA: halka (dış perde yüzünden 0,50 m dışarıda; temel çevresinde, zeminin 0,80 m altında — kabul), çubuklar, bara, bağlantılar */
    let halka = null; if (tret && tret.pts && tret.pts.length > 2) halka = otele(tret.pts.map(p => [p[0], p[1]]), 0.5); else if (bb) halka = [[bb[0] - 0.5, bb[1] - 0.5], [bb[2] + 0.5, bb[1] - 0.5], [bb[2] + 0.5, bb[3] + 0.5], [bb[0] - 0.5, bb[3] + 0.5]];
    let TR = null;
    if (halka) {
      const A = Math.abs(alan(halka)), Lc = cevre(halka);
      try { TR = EL().topraklama ? EL().topraklama({ alan: A, cevre: Lc, rho: (EL().set ? +EL().set().rho : 100) || 100, cubuk: 4 }) : null; } catch (er) { TR = null; }
      const nCub = Math.max(4, TR ? TR.cubuk : 4), zT = zZemin - 0.8;
      ekle('eluh', { sys: 'top', pts: halka.concat([halka[0]]), z: zT, cins: '30x3.5 Galvanizli Şerit', elu: u.id, layer: LY.top });
      cubukYerleri(halka, nCub).forEach((p, i) => ekle('eluc', { kind: 'te', p, kod: `TE-${i + 1}`, z: zT, elu: u.id, layer: 'EYAZI' }));
      const near = q => { let b = halka[0], bd = Infinity; for (let i = 0; i < halka.length; i++) { const a = halka[i], c = halka[(i + 1) % halka.length], l2 = (c[0] - a[0]) ** 2 + (c[1] - a[1]) ** 2 || 1, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * (c[0] - a[0]) + (q[1] - a[1]) * (c[1] - a[1])) / l2)), r = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t], d = Math.hypot(q[0] - r[0], q[1] - r[1]); if (d < bd) { bd = d; b = r; } } return b; };
      const tbP = mBot ? [mBot[0], mBot[1]] : near(cikis ? cikis.q : halka[0]), tbR = near(tbP), dtb = [tbP[0] - tbR[0], tbP[1] - tbR[1]], ldt = Math.hypot(...dtb) || 1, tbQ = [tbR[0] + dtb[0] / ldt * 0.6, tbR[1] + dtb[1] / ldt * 0.6];
      ekle('eluc', { kind: 'tb', p: tbQ, ang: Math.atan2(dtb[0], -dtb[1]), kod: 'TB-1', z: zZemin, elu: u.id, layer: 'EYAZI' });
      ekle('eluh', { sys: 'bag', pts: [tbR, tbQ], z: zZemin, cins: '', elu: u.id, layer: LY.bag });
      tavalar.forEach((t, i) => { const yol = i === 0 ? [tbQ] : [tbQ, ...(mBot ? [[mBot[0], mBot[1]]] : [])]; if (t.mBot) yol.push([t.mBot[0], t.mBot[1]]); if (t.mTop) yol.push([t.mTop[0], t.mTop[1]]); yol.push(t.uc, t.uc === t.A ? t.B : t.A); ekle('eluh', { sys: 'bag', pts: yol, z: zTava, cins: i === 0 ? '16 mm² Cu (tava, LCU, korkuluk)' : '', elu: u.id, layer: LY.bag }); });
      for (const k of kork) { const p0 = k.pts[0], r = near(p0); if (Math.hypot(p0[0] - r[0], p0[1] - r[1]) < 40) ekle('eluh', { sys: 'bag', pts: [r, [p0[0], p0[1]]], z: zT, cins: '', elu: u.id, layer: LY.bag }); }
    } else uyar.push('Ünite dış çizgisi bulunamadı: topraklama halkası konmadı.');

    /* --- AYDINLATMA ve PRİZ: korkuluk boyunca 4,80 m'de armatür (köprünün bir yanı), BHAK merdiven başında, köprü ortasında 3 fazlı priz panosu */
    const ar = UK().armaturAralik || 4.8, armKod = UK().armaturKod || 'U-LED36W', ARM = []; let BH = null;
    if (aydinlatmaVar(C.doc.set)) {
    KK.forEach((k, ki) => { const a = eksenler[ki], Y = armaturYerleri(k.pts.map(p => [p[0], p[1]]), ar);
      /* köprünün bir yanı (örnekte yolun bir kenarı): iki yandan noktası çok olan (uzun düz korkuluk); uçlar ve sahanlık girintileri hariç */
      const yan = sg => Y.filter(y => sg * proj(y.p, a.c, a.n) > (a.o1 - a.o0) * 0.25), sg = yan(1).length >= yan(-1).length ? 1 : -1, oK = sg > 0 ? a.o1 : a.o0;
      for (const y of yan(sg)) { if (Math.abs(proj(y.p, a.c, a.n) - oK) > 0.3) continue; if (ARM.some(q => Math.hypot(q.p[0] - y.p[0], q.p[1] - y.p[1]) < ar * 0.5)) continue; ARM.push({ p: y.p, a, s: proj(y.p, a.c, a.u), ki, on: [-a.n[0] * sg, -a.n[1] * sg] }); } });
    const bA = eksenler[0], bP = mTop ? [mTop[0] + bA.n[0] * 0.3, mTop[1] + bA.n[1] * 0.3] : [bA.c[0] + bA.u[0] * bA.s0, bA.c[1] + bA.u[1] * bA.s0];
    ekle('eluc', { kind: 'bhak', p: bP, ang: Math.atan2(bA.u[1], bA.u[0]), kod: 'BHAK', z: bA.z, elu: u.id, layer: 'EYAZI' });
    /* BHAK'tan i. yürüme yoluna güzergâh: aynı yol → doğrudan; öbürü → merdivenden iner, zeminden öbür merdivene, çıkar */
    const yolaGit = i => { const t = tavalar[i]; if (!t || i === 0 || !t.mTop) return [bP]; const out = [bP]; if (mTop) out.push([mTop[0], mTop[1]]); if (mBot) out.push([mBot[0], mBot[1]]); out.push([t.mBot[0], t.mBot[1]], [t.mTop[0], t.mTop[1]]); return out; };
    const ucS = i => { const t = tavalar[i], a = eksenler[i]; return t && t.mTop ? proj(t.mTop, a.c, a.u) : a.s0; };
    for (const y of ARM) y.d = Math.abs(y.s - ucS(y.ki)); /* merdiven başından uzaklık sırası */
    ARM.sort((x, y) => (x.ki - y.ki) || (x.d - y.d));
    const ar1 = EL().ARMATUR ? EL().ARMATUR[armKod] : null, Warm = ar1 ? ar1.W : 36, linyeler = [];
    eksenler.forEach((a, ki) => { const S0 = ARM.filter(y => y.ki === ki), nk = linyeSay(S0.length); for (let j = 0; j < nk; j++) { const S1 = S0.slice(j * Math.ceil(S0.length / nk), (j + 1) * Math.ceil(S0.length / nk)); if (S1.length) linyeler.push({ ki, S1 }); } });
    linyeler.forEach((L1, li) => { for (const y of L1.S1) { y.linye = li + 1; ekle('eluc', { kind: 'arm', p: y.p, ang: Math.atan2(y.a.u[1], y.a.u[0]), on: y.on, kod: armKod, linye: y.linye, W: Warm, z: y.a.z, H: UK().direkH || 3.5, elu: u.id, layer: 'EYAZI' }); }
      const g0 = yolaGit(L1.ki), son0 = g0[g0.length - 1], a0_ = eksenler[L1.ki], f0 = L1.S1[0].p, kz = [a0_.c[0] + a0_.u[0] * proj(f0, a0_.c, a0_.u) + a0_.n[0] * proj(son0, a0_.c, a0_.n), a0_.c[1] + a0_.u[1] * proj(f0, a0_.c, a0_.u) + a0_.n[1] * proj(son0, a0_.c, a0_.n)];
      ekle('eluh', { sys: 'ayd', pts: [...g0, kz, ...L1.S1.map(y => y.p)], z: eksenler[L1.ki].z + 0.5, kod: `L${li + 1}`, cins: '3x2.5 NYY', linye: li + 1, W: L1.S1.length * Warm, elu: u.id, layer: LY.ayd }); });
    const nL = linyeler.length;
    const PRZ = eksenler.map((a, i) => { const oP = a.o0 + 0.25, p = [a.c[0] + a.u[0] * ((a.s0 + a.s1) / 2) + a.n[0] * oP, a.c[1] + a.u[1] * ((a.s0 + a.s1) / 2) + a.n[1] * oP]; ekle('eluc', { kind: 'prizp', p, ang: Math.atan2(a.u[1], a.u[0]), kod: `PP-${i + 1}`, z: a.z, elu: u.id, layer: 'EYAZI' });
      const g = yolaGit(i), son = g[g.length - 1], kose = [son[0] + a.n[0] * (oP - proj(son, a.c, a.n)), son[1] + a.n[1] * (oP - proj(son, a.c, a.n))];
      ekle('eluh', { sys: 'priz', pts: [...g, kose, p], z: a.z + 0.5, kod: `PP-${i + 1}`, cins: '4x4 NYY', elu: u.id, layer: LY.priz }); return p; });
    BH = bhak({ isik: linyeler.map(L1 => L1.S1.length * Warm), priz: PRZ.map(() => 3000), yedek: 2 });
    }
    /* tava metrajı, ek parçalar, kablo döşeme açılımı, branş boruları (el-tava.js) */
    const hatKab = (t, q) => t.kablolar.filter(k => tavada(k) && hatSinif(k) === q).map(k => ({ kod: k.kod, cins: k.cins, d: disCap(k.cins) }));
    const tavaHat = tavalar.flatMap((t, i) => ['ag', 'zayif'].filter(q => t.sec && t.sec[q]).map(q => Object.assign({ yol: i + 1, sinif: q, L: Math.round(Math.hypot(t.B[0] - t.A[0], t.B[1] - t.A[1]) * 100) / 100, nKablo: hatKab(t, q).length }, t.sec[q])));
    const doseme = tavalar.map((t, i) => { const o = { yol: i + 1 }; for (const q of ['ag', 'zayif']) o[q] = t.sec && t.sec[q] ? { w: t.sec[q].w, h: t.sec[q].h, n: t.sec[q].n, kablolar: hatKab(t, q) } : null; return o; });
    const brans = C.doc.ents.filter(e => !e.gv && e.elu === u.id && e.type === 'eluh' && /^(guc2?|kum2?|lk|enst)$/.test(e.sys)).map(e => { const P0 = e.pts, top = (i0) => { let l = 0; for (let i = i0 + 1; i < P0.length; i++) l += Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]); return l; }; return { boru: boruSec(e.cins), tava: !/2$/.test(e.sys), L: Math.round(top(/2$/.test(e.sys) ? 0 : P0.length - 2) * 100) / 100 }; }); /* tava boyunca giden parça boruya girmez */
    const TV = C.elTavaApi, metraj = TV ? TV.tavaMetraj(tavaHat) : null, boruMet = TV ? TV.boruMetraj(brans) : null;
    const st = durum(); st[u.id] = Object.assign(st[u.id] || {}, { girisler, giris: C.elTavaApi ? C.elTavaApi.kabloGiris(C.doc.set) : 'baca', nGiris: girisNo, metraj, boruMet, doseme, t: Date.now(), motor: MS, enstruman: ENS, kablo: KL, bhak: BH, topraklama: TR, arm: ARM.length, armKod, tava: tavalar.map(t => t.sec), zTava, uyar });
    return { MS, KL, BH, TR, ARM, uyar, tavalar };
  }

  /* ======================= PAFTA TABLOLARI (kâğıt mm; elsema biçimi { L, T, S }) ======================= */
  const cz = () => (EL()._cizer ? EL()._cizer() : (() => { const g = { L: [], T: [], S: [] }; return { g, L: (a, b, c, d, s) => g.L.push([a, b, c, d, s || 'i']), T: (x, y, h, s, al, rot, col) => g.T.push([x, y, h, String(s), al || 'L', rot || 0, col == null ? 2 : col]), B(x, y, w, h, s) { this.L(x, y, x + w, y, s); this.L(x + w, y, x + w, y + h, s); this.L(x + w, y + h, x, y + h, s); this.L(x, y + h, x, y, s); } }; })());
  const sMm = k => mmU(k);
  /* E-BP 001 lejantı + kablo etiketi açıklaması + notlar */
  function lejant1(d) {
    const c = cz(), h = sMm('lejant'), rh = h * 2.6; c.g.S = c.g.S || []; let y = 0;
    c.T(0, y, sMm('baslik'), 'SEMBOLLER', 'L', 0, 2); y -= rh * 1.2;
    const sat = (cizim, yazi) => { cizim(4, y + h * 0.4); c.T(26, y, h, yazi, 'L', 0, 2); y -= rh; };
    sat((x, yy) => { c.B(x, yy - 2, 14, 5, 'k'); c.L(x, yy - 2, x + 14, yy + 3, 'i'); c.L(x, yy + 3, x + 14, yy - 2, 'i'); }, 'ANA DAĞITIM VE MOTOR BESLEME PANOLARI (MCC)');
    sat((x, yy) => { const w = ((UK().sembol || {}).lcu || 11.9) / 5; c.B(x + 5, yy - w / 2, w, w, 'i'); c.L(x + 5, yy - w / 2, x + 5 + w, yy + w / 2, 'i'); c.g.S.push([[x + 5, yy - w / 2], [x + 5 + w, yy - w / 2], [x + 5 + w, yy + w / 2]]); }, 'SAHA LOKAL KUMANDA PANOSU (LCU)');
    sat((x, yy) => { const w = ((UK().sembol || {}).jb || 8) / 5; c.B(x + 5.5, yy - w / 2, w, w, 'i'); }, 'JUNCTION BOX (JB)');
    sat((x, yy) => { const r = ((UK().sembol || {}).motorR || 15.6) / 5; const N = 20; for (let i = 0; i < N; i++) { const a0 = 2 * Math.PI * i / N, a1 = 2 * Math.PI * (i + 1) / N; c.L(x + 7 + r * Math.cos(a0), yy + r * Math.sin(a0), x + 7 + r * Math.cos(a1), yy + r * Math.sin(a1), 'i'); } c.T(x + 7, yy + 0.2, r * 0.62, 'M', 'BC', 0, 2); c.T(x + 7, yy - 0.3, r * 0.5, '3~', 'TC', 0, 2); }, 'ELEKTRİK MOTORU');
    sat((x, yy) => c.L(x, yy, x + 18, yy, 'gK'), 'GÜÇ KABLOLARI');
    sat((x, yy) => c.L(x, yy, x + 18, yy, 'kK'), 'KUMANDA KABLOLARI');
    sat((x, yy) => c.L(x, yy, x + 18, yy, 'gK2'), 'GÜÇ KABLOLARI 2. KADEME');
    sat((x, yy) => c.L(x, yy, x + 18, yy, 'kK2'), 'KUMANDA KABLOLARI 2. KADEME');
    sat((x, yy) => { const r = ((UK().sembol || {}).motorR || 15.6) / 5, N = 20; for (let i = 0; i < N; i++) { const a0 = 2 * Math.PI * i / N, a1 = 2 * Math.PI * (i + 1) / N; c.L(x + 7 + r * Math.cos(a0), yy + r * Math.sin(a0), x + 7 + r * Math.cos(a1), yy + r * Math.sin(a1), 'i'); } c.T(x + 7, yy - r * 0.25, r * 0.5, 'ORP', 'MC', 0, 2); }, 'REDOKS METRE (ORP)');
    if (d && d.giris === 'galeri') sat((x, yy) => { c.L(x, yy - 2, x + 18, yy - 2, 'k'); c.L(x, yy + 2, x + 18, yy + 2, 'k'); }, 'KABLO GALERİSİ'); else sat((x, yy) => { c.B(x + 5, yy - 2.5, 5, 5, 'k'); c.B(x + 5.5, yy - 2, 4, 4, 't'); }, 'KABLO BACASI (100x100 cm)');
    sat((x, yy) => { c.L(x, yy - 1, x + 18, yy - 1, 'k'); c.L(x, yy + 1, x + 18, yy + 1, 'k'); }, 'AG KABLO TAVASI (GxY mm, EL: tava alt kotu)');
    sat((x, yy) => { c.L(x, yy - 1, x + 18, yy - 1, 'kK2'); c.L(x, yy + 1, x + 18, yy + 1, 'kK2'); }, 'ZAYIF AKIM KABLO TAVASI (AG TAVASININ ALTINDA)');
    y -= rh * 0.4;
    /* kablo etiketi açıklaması (örnekteki gibi) */
    const ac = (kod, satirlar) => { const x0 = 6, hk = sMm('kablo'); c.T(x0, y, hk, kod, 'L', 0, 2); const xs = [x0 + 1, x0 + 4.2, x0 + 8.2, x0 + 13]; let yy = y - rh * 0.9;
      satirlar.forEach((s, i) => { const xi = xs[satirlar.length - 1 - i]; c.L(xi, y - 0.8, xi, yy + h * 0.35, 'h'); c.L(xi, yy + h * 0.35, 40, yy + h * 0.35, 'h'); c.T(42, yy, h * 0.85, s, 'L', 0, 2); yy -= rh * 0.75; }); y = yy - rh * 0.4; };
    ac('GK-1/Z-108/A', ['EKİPMAN KODU', 'ÇIKTIĞI PANO (1: MCC-1, 2: LOKAL PANO)', 'GÜÇ KABLOLARI']);
    ac('KK-LK-1/Z-108/A', ['EKİPMAN KODU', 'ÇIKTIĞI PANO', 'LOKAL KUMANDA', 'KUMANDA KABLOLARI']);
    y -= rh * 0.3; c.T(0, y, sMm('baslik'), 'NOTLAR:', 'L', 0, 2); y -= rh;
    for (const [t, ic] of [...NOT1, d && d.giris === 'galeri' ? ['9- ÜNİTEYE GELEN KABLOLAR GENEL YERLEŞİME GÖRE KABLO GALERİSİ İLE GELECEKTİR.'] : ['9- ÜNİTEYE GELEN KABLOLAR YAPI KENARINDAKİ KABLO BACASINDAN 4xØ100 PVC BORU İLE GELECEKTİR.']]) { c.T(ic ? 6 : 2, y, h, t, 'L', 0, 2); y -= rh * 0.85; }
    return c.g;
  }
  /* notlar elle bölünmüş satırlar (çeviri anahtarı satır satır: dil-en.js); [metin, girinti] */
  const NOT1 = [['1- TEKNİK ÜNİTELERİN KUVVET KABLOLARI, KANAL İLE YAPI ARASINDA KABLO SAYISI'], ['VE CİNSİNE UYGUN ÇAPTAKİ PVC BORULAR İÇERİSİNE ALINACAKTIR.', 1],
    ['2- TEKNİK ÜNİTELERİN ÇEVRE VEYA BÖLME DUVARLARI İLE YÜRÜME YOLLARI KENARLARINDAN'], ['ÇEKİLECEK KUVVET KABLOLARI GALVANİZLİ DELİKLİ KABLO TEPSİLERİ ÜZERİNE DÖŞENECEKTİR.', 1],
    ['3- TEKNİK ÜNİTELERE AÇIKTAN GEÇİRİLECEK KUVVET KABLOLARI, KABLO CİNSİNE UYGUN ÇAPTA'], ['GALVANİZLİ BORULAR İÇİNDEN ÇEKİLECEKTİR.', 1],
    ['4- KABLO KESİTLERİ MOTOR GÜCÜNDEN AKIM TAŞIMA KOŞULUYLA SEÇİLMİŞTİR'], ['(cosφ 0,85, verim 0,87, tava gruplama 0,80, 1,25 In).', 1],
    ['MCC PANOSUNUN YERİ VE KABLO BOYLARI GENEL YERLEŞİM VE GENEL KABLOLAMADA BELİRLENECEK;', 1], ['GERİLİM DÜŞÜMÜ KONTROLÜ BOYLARLA BİRLİKTE YAPILACAKTIR.', 1],
    ['5- MARKA / MODEL BELİRTİLMEMİŞTİR; EŞDEĞER ÜRÜN KULLANILABİLİR.'],
    ['6- AG VE ZAYIF AKIM (KUMANDA, ENSTRÜMAN) KABLOLARI AYRI TAVALARDAN GEÇİRİLECEKTİR;'], ['TAVA ÖLÇÜLERİ KABLO KESİTİNE GÖRE, DOLULUK EN ÇOK %40 ALINARAK SEÇİLMİŞTİR.', 1],
    ['8- TAVALAR YÜRÜME YOLU DÖŞEMESİNİN DIŞ KENARINDA GİDER, YÜRÜME ALANINA GİRMEZ;'], ['KARŞI KENARA GEÇEN KABLOLAR DÖŞEME ALTINDAN GALVANİZ BORU İLE GEÇER.', 1]];
  const NOT2 = [['1- HAVUZ ÇEVRESİNE 30x3.5 GALVANİZLİ ŞERİT İLE HALKA TOPRAKLAYICI, TEMELE'], ['30x3.5 GALVANİZLİ ŞERİT İLE TEMEL TOPRAKLAMASI YAPILACAKTIR.', 1],
    ['2- KÖŞELERE BAKIR KILIFLI ÇELİK TOPRAKLAMA ÇUBUĞU (Ø20, L=3 m) ÇAKILACAK,'], ['ŞERİDE ÇAPRAZ KLEMENSLE BAĞLANACAKTIR.', 1],
    ['3- KABLO TAVALARI, KORKULUKLAR, LOKAL PANOLAR VE ELEKTRİKLİ EKİPMANLAR EN AZ'], ['16 mm² Cu İLETKENLE TB-1 TOPRAKLAMA BARASINA BAĞLANACAKTIR.', 1]];
  const NOT3 = [['1- ARMATÜRLER LED ETANŞTIR (KOD, GÜÇ, IŞIK AKISI, RENK SICAKLIĞI VE IP SINIFI'], ['SEMBOLLER LİSTESİNDE); KORKULUĞA 3" GALVANİZ BORU DİREKLE MONTE EDİLECEKTİR.', 1],
    ['2- IŞIK LİNYELERİ 3x2.5 NYY, PRİZ PANOSU BESLEMELERİ 4x4 NYY KABLO İLE, KABLO TAVASI'], ['ÜZERİNDEN VE AÇIKTA GALVANİZLİ BORU İÇİNDEN ÇEKİLECEKTİR.', 1],
    ['3- BHAK ANAHTAR KUTUSU MCC-1 PANOSUNDAN BESLENİR (KABLO VE ANA ŞALTER TEK HAT'], ['ŞEMASINDA); KABLO BOYU VE GERİLİM DÜŞÜMÜ GENEL KABLOLAMADA BELİRLENECEKTİR.', 1],
    ['4- BÜTÜN ARMATÜR DİREKLERİ, PRİZ PANOLARI VE ANAHTAR KUTULARI TOPRAKLAMA'], ['SİSTEMİNE BAĞLANACAKTIR.', 1]];
  /* genel tablo: başlık + sütunlar + satırlar */
  function tablo(baslik, cols, rows, o) {
    o = o || {}; const c = cz(), h = o.h || sMm('tablo'), rh = h * 2.2, W = cols.reduce((s, x) => s + x.w, 0); let y = 0;
    c.T(W / 2, y + rh * 0.3, h * 1.2, baslik, 'MC', 0, 2); c.L(0, y, W, y, 'k');
    let x = 0; for (const col of cols) { c.T(x + col.w / 2, y - rh / 2 - h * 0.35, h * 0.9, col.t, 'MC', 0, 2); x += col.w; } y -= rh; c.L(0, y, W, y, 'k');
    for (const r of rows) { x = 0; r.forEach((v, i) => { const col = cols[i]; c.T(col.al === 'L' ? x + 1.5 : x + col.w / 2, y - rh / 2 - h * 0.35, h, v, col.al === 'L' ? 'L' : 'MC', 0, 2); x += col.w; }); y -= rh; c.L(0, y, W, y, 'i'); }
    c.L(0, y, W, y, 'k'); x = 0; c.L(0, 0, 0, y, 'k'); for (const col of cols) { x += col.w; c.L(x, 0, x, y, x >= W - 1e-6 ? 'k' : 'i'); }
    return c.g;
  }
  /* E-BP 002 TOPRAKLAMA SEMBOLLERİ */
  function lejant2() {
    const c = cz(), h = sMm('lejant'), rh = h * 3, W = [36, 110]; let y = 0;
    c.T((W[0] + W[1]) / 2, y + 3, sMm('baslik'), 'TOPRAKLAMA SEMBOLLERİ', 'MC', 0, 2); c.B(0, y - rh, W[0] + W[1], rh, 'k'); c.L(W[0], y, W[0], y - rh, 'i'); c.T(W[0] / 2, y - rh / 2 - h * 0.35, h, 'SEMBOL', 'MC', 0, 2); c.T(W[0] + W[1] / 2, y - rh / 2 - h * 0.35, h, 'AÇIKLAMA', 'MC', 0, 2); y -= rh;
    const sat = (ciz, t) => { ciz(W[0] / 2, y - rh / 2); c.T(W[0] + 3, y - rh / 2 - h * 0.35, h, t, 'L', 0, 2); c.L(0, y - rh, W[0] + W[1], y - rh, 'i'); c.L(0, y, 0, y - rh, 'k'); c.L(W[0], y, W[0], y - rh, 'i'); c.L(W[0] + W[1], y, W[0] + W[1], y - rh, 'k'); y -= rh; };
    sat((x, yy) => c.L(x - 12, yy, x + 12, yy, 't'), 'TOPRAKLAMA İLETKENİ (30x3.5 Galvanizli Şerit)');
    sat((x, yy) => { c.L(x - 12, yy - 0.6, x + 12, yy - 0.6, 't'); c.L(x - 12, yy + 0.6, x + 12, yy + 0.6, 't'); }, 'TEMEL TOPRAKLAMA İLETKENİ (30x3.5 Galv.Şerit)');
    sat((x, yy) => { const r = 2; const N = 18; for (let i = 0; i < N; i++) { const a0 = 2 * Math.PI * i / N, a1 = 2 * Math.PI * (i + 1) / N; c.L(x + r * Math.cos(a0), yy + r * Math.sin(a0), x + r * Math.cos(a1), yy + r * Math.sin(a1), 'i'); } c.L(x - 1.4, yy - 1.4, x + 1.4, yy + 1.4, 'i'); c.L(x - 1.4, yy + 1.4, x + 1.4, yy - 1.4, 'i'); }, 'BAKIR KILIFLI ÇELİK TOPRAKLAMA ÇUBUĞU (Ø20mm , L=3m.)');
    sat((x, yy) => { c.g.S = c.g.S || []; c.g.S.push([[x - 4, yy - 1], [x + 4, yy - 1], [x + 4, yy + 1], [x - 4, yy + 1]]); }, 'TOPRAKLAMA BUS-BAR (40x5 Cu)');
    sat((x, yy) => { c.L(x - 8, yy - 1.5, x + 8, yy - 1.5, 'i'); c.L(x, yy - 1.5, x, yy + 3, 'i'); }, 'TERMİNAL BAĞLANTISI (≥16 mm² Cu)');
    return c.g;
  }
  /* E-BP 003 SEMBOLLER */
  function lejant3(armKod) {
    const c = cz(), h = sMm('lejant'), rh = h * 2.8; c.g.S = c.g.S || []; let y = 0;
    c.T(0, y, sMm('baslik'), 'SEMBOLLER', 'L', 0, 2); y -= rh * 1.2;
    const sat = (ciz, t) => { ciz(8, y + h * 0.4); c.T(26, y, h, t, 'L', 0, 2); y -= rh; };
    const A = EL().ARMATUR && EL().ARMATUR[armKod];
    sat((x, yy) => { c.L(x, yy - 3, x, yy + 0.5, 'i'); c.g.S.push([[x, yy + 0.5], [x - 1.4, yy + 3], [x + 1.4, yy + 3]]); }, 'KORKULUĞA MONTE EDİLMİŞ LED ETANŞ ARMATÜR'); if (A) { y += rh * 0.45; c.T(26, y, h * 0.85, `${armKod}: ${A.W} W, ${A.lm} lm, ${A.K} K, IP${A.ip}`, 'L', 0, 2); y -= rh; }
    sat((x, yy) => { c.B(x - 1.6, yy - 2.3, 3.2, 4.6, 'i'); c.L(x + 0.4, yy + 1.5, x - 0.5, yy, 'i'); c.L(x - 0.5, yy, x + 0.5, yy, 'i'); c.L(x + 0.5, yy, x - 0.4, yy - 1.5, 'i'); }, 'KORKULUĞA MONTE EDİLMİŞ ETANŞ ANAHTAR KUTUSU (BHAK)');
    sat((x, yy) => { c.B(x - 3, yy - 1.5, 6, 3.6, 'i'); c.L(x - 2.3, yy, x - 0.7, yy, 'i'); c.L(x + 0.7, yy, x + 2.3, yy, 'i'); }, '3 FAZLI PRİZ PANOSU (1x16A TOPRAKLI + 3x32A 3 FAZ PRİZ, IP65)');
    sat((x, yy) => c.L(x - 8, yy, x + 8, yy, 'k'), 'IŞIK LİNYESİ 3x2.5 NYY / PRİZ PANOSU BESLEMESİ 4x4 NYY');
    return c.g;
  }
  /* BHAK ANAHTAR KUTUSU TEK HAT ŞEMASI (E-BP 003 düzeni: başlık + güç, bara yatay, çıkışlar aşağı, yazılar düşey) */
  function tekHat(B) {
    const c = cz(), h = KR().yaziMm ? KR().yaziMm.tekHat || 2.16 : 2.16, adim = 13, x0 = 22, n = B.cik.length, xb1 = x0 + adim * (n - 1) + 6, yb = 0;
    c.T(0, 34, sMm('baslik'), 'BHAK ANAHTAR KUTUSU TEK HAT ŞEMASI', 'L', 0, 2); c.T(0, 28, sMm('baslik'), `${Math.round(B.kurulu)}W`, 'L', 0, 2);
    c.L(4, yb, xb1, yb, 'b'); c.L(8, yb, 8, -12, 'k'); c.B(5, -18, 6, 6, 'k'); c.L(5, -18, 11, -12, 'i'); c.T(13, -6, h, `3x${B.In}A.`, 'L', Math.PI / 2, 2); c.L(8, -18, 8, -62, 'k');
    c.T(10, -60, h, `${B.kablo}`, 'L', Math.PI / 2, 2); c.T(4, -60, h, `${B.kod}`, 'L', Math.PI / 2, 2); c.T(-2, -60, h, 'MCC-1 PANOSUNDAN', 'L', Math.PI / 2, 2);
    B.cik.forEach((x, i) => { const xx = x0 + adim * i; c.L(xx, yb, xx, -6, 'k'); c.B(xx - 2.5, -13, 5, 7, 'k'); c.L(xx - 2.5, -13, xx + 2.5, -6, 'i'); c.L(xx, -13, xx, -34, 'k');
      c.T(xx + 4.5, -1, h, x.faz === 3 ? `3x${x.In}A.` : `${x.In}A.`, 'R', Math.PI / 2, 2);
      if (x.kablo) c.T(xx - 1, -16, h, x.kablo, 'R', Math.PI / 2, 2);
      const N = 16, r = 3; for (let k = 0; k < N; k++) { const a0 = 2 * Math.PI * k / N, a1 = 2 * Math.PI * (k + 1) / N; c.L(xx + r * Math.cos(a0), -37 + r * Math.sin(a0), xx + r * Math.cos(a1), -37 + r * Math.sin(a1), 'i'); }
      c.T(xx, -37 - h * 0.4, h, x.no, 'MC', 0, 2); c.T(xx - 1, -42, h, x.aciklama, 'R', Math.PI / 2, 2); if (x.W) c.T(xx + 2.6, -42, h, `(${x.W}W)`, 'R', Math.PI / 2, 2); });
    return c.g;
  }
  /* korkuluğa monte LED etanş armatür montaj detayı (E-BP 003, ölçeksiz): yürüme platformu, korkuluk, 3" galv. boru, Ø10 U-bolt, L50x50x6 150 mm kaynak, armatür */
  function detayArmatur(armKod, H) {
    const c = cz(), h = KR().yaziMm ? KR().yaziMm.detay || 2.4 : 2.4, k = 12 / 1.1, Hm = (H || 3.5) * k; c.g.S = c.g.S || [];
    c.T(0, Hm + 18, sMm('baslik'), 'METAL KORKULUĞA MONTELİ LED ETANŞ ARMATÜR MONTAJI', 'L', 0, 2); c.T(0, Hm + 12, h, 'ÖLÇEKSİZ', 'L', 0, 2);
    c.L(-10, 0, 40, 0, 'k'); c.L(-10, -2, 40, -2, 'k'); c.T(42, -1.5, h, 'YÜRÜME PLATFORMU', 'L', 0, 2);
    c.L(8, 0, 8, 1.1 * k, 'k'); c.L(8, 1.1 * k, 30, 1.1 * k, 'k'); c.L(8, 0.55 * k, 30, 0.55 * k, 'i'); c.L(30, 0, 30, 1.1 * k, 'k'); c.T(32, 0.55 * k, h, 'METAL KORKULUK', 'L', 0, 2);
    c.L(10.5, 0.15 * k, 10.5, Hm, 'k'); c.L(13, 0.15 * k, 13, Hm, 'k'); c.T(15, Hm * 0.6, h, '3" GALV. BORU', 'L', 0, 2);
    for (const zz of [0.35 * k, 0.9 * k]) { c.L(8, zz, 13.5, zz, 'k'); c.L(13.5, zz - 0.6, 13.5, zz + 0.6, 'k'); } c.T(15, 0.9 * k + 1, h, 'Ø10 U-BOLT', 'L', 0, 2);
    c.L(10.5, 0.15 * k, 13, 0.15 * k, 'k'); c.L(13, 0.15 * k, 16, 0.15 * k, 'k'); c.T(17, 0.15 * k - 1, h, 'L 50x50x6 150mm KAYNAK', 'L', 0, 2);
    c.L(11.75, Hm, 22, Hm + 4, 'k'); c.g.S.push([[18, Hm + 3.2], [30, Hm + 7.8], [29.2, Hm + 9.4], [17.2, Hm + 4.8]]); c.T(31, Hm + 8, h, `${armKod} LED ETANŞ ARMATÜR`, 'L', 0, 2);
    c.L(-4, 0, -4, Hm, 'i'); c.L(-6, 0, -2, 0, 'i'); c.L(-6, Hm, -2, Hm, 'i'); c.T(-5, Hm / 2, h, String(Math.round((H || 3.5) * 1000)), 'MC', Math.PI / 2, 2);
    return c.g;
  }
  /* aydınlatma notları (LED, linye, hesap) */
  function notlar3(d) {
    const c = cz(), h = sMm('not'), rh = h * 2.2; let y = 0; c.T(0, y, sMm('baslik'), 'NOTLAR:', 'L', 0, 2); y -= rh * 1.2;
    const sat = [...NOT3, [`5- ARMATÜR ARALIĞI ${vir(UK().armaturAralik || 4.8)} m, DİREK YÜKSEKLİĞİ ${vir(UK().direkH || 3.5)} m.`]]; void d;
    for (const [t, ic] of sat) { c.T(ic ? 4 : 0, y, h, t, 'L', 0, 2); y -= rh; }
    return c.g;
  }
  function notlar2(TR) {
    const c = cz(), h = sMm('not'), rh = h * 2.2; let y = 0; c.T(0, y, sMm('baslik'), 'NOTLAR:', 'L', 0, 2); y -= rh * 1.2;
    const sat = [...NOT2, TR ? [`4- TOPRAKLAMA DİRENCİ R = ${vir(TR.R)} Ω (ρ = ${Math.round(TR.rho)} Ωm, ${TR.cubuk} ÇUBUK);`] : ['4- TOPRAKLAMA DİRENCİ'], ['ÖLÇÜLEREK DOĞRULANACAKTIR.', 1]];
    for (const [t, ic] of sat) { c.T(ic ? 4 : 0, y, h, t, 'L', 0, 2); y -= rh; }
    return c.g;
  }

  /* ======================= PAFTALAR ======================= */
  const PAF = [
    { tur: 'guc', ad: 'GÜÇ, KUMANDA, ENSTRÜMAN KABLO VE TAVA PLANI', sys: ['tava', 'galeri', 'guc', 'kum', 'lk', 'guc2', 'kum2', 'enst', 'mcc'], kind: ['motor', 'orp', 'jb', 'lcu', 'baca', 'mcc', 'etk'] },
    { tur: 'tav', ad: 'KABLO TAVASI DETAYLARI VE METRAJ', sys: [], kind: [], detay: true },
    { tur: 'top', ad: 'TOPRAKLAMA PLANI', sys: ['top', 'bag'], kind: ['te', 'tb'] },
    { tur: 'ayd', ad: 'AYDINLATMA VE PRİZ TESİSATI PLANI', sys: ['ayd', 'priz'], kind: ['arm', 'bhak', 'prizp'] },
  ];
  const up = s => String(s || '').toLocaleUpperCase('tr');
  const turOf = L => String(L.elUniteParca || '').split('_')[0];
  const temizle = u => { const st = durum(), s0 = st[u.id] || {}, L0 = C.doc.layouts || [], bu = L0.filter(L => L.elUnite === u.id), korunan = [...new Set(bu.filter(L => L.elle).map(turOf))], kalan = bu.filter(L => korunan.includes(turOf(L))), kal = new Set(kalan.flatMap(L => (L.vps || []).map(v => v.gvOnly).filter(Boolean))), gs = new Set((s0.gvs || []).filter(g => !kal.has(g)));
    C.doc.ents = C.doc.ents.filter(e => !(e.gv && gs.has(e.gv))); C.doc.layouts = L0.filter(L => L.elUnite !== u.id || kalan.includes(L)); s0.gvs = [...kal]; s0.korunan = korunan; st[u.id] = s0; return s0; };
  const semaEnt = (gv, p, g, tur) => ekle('elsema', { p: [p[0], p[1], 0], g, tur, gv, layer: 'EYAZI' });
  /* elsema çizgi stilleri: kablo lejantı için katman renginde çizgi (gK güç, kK kumanda, 2 = kesikli) — elsema yalnız k/i/b/t/h bilir; ek stiller burada */
  { const t0 = T.elsema; if (t0 && !t0._eluSar) { const p0 = t0.prims; t0.prims = e => { const g = e.g || {}; const ek = (g.L || []).filter(l => /^[gk]K2?$/.test(l[4]));
      if (!ek.length) return p0(e); const out = p0(Object.assign({}, e, { g: Object.assign({}, g, { L: g.L.filter(l => !/^[gk]K2?$/.test(l[4])) }) })), k = C.doc.set.anno / 1000, o = M.p3(e.p);
      for (const l of ek) { const t = ((KR().katmanlar || {})[{ gK: 'ELK_GUC', kK: 'ELK_KUMANDA', gK2: 'ELK_GUC2', kK2: 'ELK_KUMANDA2' }[l[4]]]) || { renk: 7, tip: 'Continuous', kal: 0.25 }; /* kablo lejantı: katman kuralından (renk, çizgi tipi, kalınlık) */
        out.unshift(L([o[0] + l[0] * k, o[1] + l[1] * k, 0], [o[0] + l[2] * k, o[1] + l[3] * k, 0], { color: t.renk, lw: Math.round(t.kal * 100), lt: /^continuous$/i.test(t.tip) ? undefined : String(t.tip).toUpperCase() })); }
      return out; }; t0._eluSar = true; } }
  const gKutu = g => { let b = null; const ek = (x, y) => { if (!b) b = [x, y, x, y]; else { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } };
    for (const l of g.L || []) { ek(l[0], l[1]); ek(l[2], l[3]); } for (const t of g.T || []) { const w = String(t[3]).length * t[2] * 0.6; if (t[5]) { ek(t[0] - t[2], t[1]); ek(t[0] + t[2], t[1] + (/^R/.test(t[4]) ? -w : w)); } else { const x0 = /C$|^MC/.test(t[4]) ? t[0] - w / 2 : /R$/.test(t[4]) ? t[0] - w : t[0]; ek(x0, t[1] - t[2] * 0.3); ek(x0 + w, t[1] + t[2]); } } for (const s of g.S || []) for (const q of s) ek(q[0], q[1]); return b; };

  const olcekBul = ents => { const Ap = C.mimariPaftaApi, bb = C.extents(ents); if (!Ap || !Ap.olcekSec || !bb) return 50; const lx = bb[2] - bb[0], ly = bb[3] - bb[1];
    try { return Ap.olcekSec([{ id: 'plan', w: lx, h: ly, kenarMm: 41, altMm: 15 }], { antetW: C.antetGen ? C.antetGen() : 0 }).olcek || 50; } catch (er) { return 50; } };

  const uret = async (u) => {
    const A = C.mekPaftaArac, Ap = C.mimariPaftaApi; if (!A || !Ap || !C.makeView) { C.warn('Pafta modülleri yüklenmemiş (istasyon-pafta.js / mimari-pafta.js).'); return null; }
    const ids = [u.id, ...C.doc.ents.filter(x => x.bag === u.id && !x.gv && x.type !== 'su').map(x => x.id)], idSet = new Set(ids), ents = C.doc.ents.filter(x => idSet.has(x.id));
    const SC = olcekBul(ents), anno0 = C.doc.set.anno; C.doc.set.anno = SC;
    try {
      const R = yerlestir(u); /* yazı ve etiket kutuları pafta ölçeğinde */
      let tarif = null; try { tarif = tarifli(u) ? C.T[u.type].paftaTarifi(u, { kh: 1.2 }) : null; } catch (er) { console.error('ünite pafta tarifi', er); }
      const pl = tarif && tarif.planlar && tarif.planlar.length ? (tarif.planlar.find(p => !p.kesit) || tarif.planlar[tarif.planlar.length - 1]) : null;
      const st = temizle(u), bb = C.extents(ents), tum = C.extents(C.doc.ents.filter(e => e.type !== 'sheet')) || bb; const X0 = tum[2] + 40; let Yc = tum[3];
      const yapi = up((tarif && tarif.ad) || `${u.code || ''} ${u.name || ''}`.trim() || 'ÜNİTE'), paf = [], kf = SC / 1000;
      const elE = C.doc.ents.filter(e => !e.gv && e.elu === u.id && (e.type === 'eluc' || e.type === 'eluh'));
      const d = durum()[u.id] || {};
      for (const PF of PAF) {
        if (PF.tur === 'ayd' && !aydinlatmaVar(C.doc.set)) continue;
        if ((st.korunan || []).includes(PF.tur)) continue; /* elle düzeltildi: bu pafta yeniden üretilmez */
        const place = [X0, Yc - (bb[3] - bb[1]) - 2], ref = [bb[0], bb[1]], dx = place[0] - ref[0], dy = place[1] - ref[1], Wp = q => [q[0] + dx, q[1] + dy];
        const res = PF.detay ? { gv: null } : C.makeView({ kind: 'plan', h: pl ? pl.h : (+u.zt || 0) + 1.2, depth: pl ? pl.depth : 8, place, ref, ids: ents.filter(e => !(pl && pl.gizle && pl.gizle(e))).map(e => e.id), hatch: 'YOK', title: `${PF.ad}`, mek: true, poz: false, dograma: false });
        if (!res) continue; if (res.gv) st.gvs.push(res.gv);
        /* elektrik nesnelerinin pafta kopyaları (ötelenmiş; açıklama ölçeği pencereden) */
        for (const e of elE) { if (!(e.type === 'eluh' ? PF.sys.includes(e.sys) : PF.kind.includes(e.kind))) continue;
          const c = JSON.parse(JSON.stringify(e)); for (const k of ['id', '_c', 'sp']) delete c[k]; c.gv = res.gv;
          if (c.p) c.p = Wp(c.p); if (c.q) c.q = Wp(c.q); if (c.pts) c.pts = c.pts.map(Wp); const x = C.add(C.newEnt(c.type, c)); if (x) delete x.sp; }
        /* başlık en alta (mimari düzen) */
        { const g = C.doc.ents.filter(e => e.gv === res.gv); g.forEach(e => { delete e._c; }); const b = C.extents(g.filter(e => e.type !== 'baslik')); if (b) for (const e of g) if (e.type === 'baslik') { e.ay = b[1]; e.dmm = 11; e.p = [e.p[0], b[1] - 11 * C.annoH(1), 0]; delete e._c; } }
        /* güç paftasında kesitler (mekanik ünite paftası gibi): tavalar kesit düzleminde gerçek ölçüde */
        const kesitGv = []; if (PF.tur === 'guc' && tarif) { let yK = (() => { const b = C.extents(C.doc.ents.filter(e => e.gv === res.gv)); return b ? b[1] - 12 : Yc - 20; })(); const harf = 'ABCDEFGHIJ';
          for (const [ki, k] of (tarif.kesitler || []).entries()) { const ic = 'V' + harf[ki % 10]; let r = null; try { r = await A.kesitAl(ic, k.a, k.b, k.sp, k.depth, [X0, yK], { kv: ['GIZLI=E', 'POZ=H'], onek: 'UELK_KESIT_', acilim: false, durum: false }); } catch (er) { console.error('elektrik kesiti', er); } if (!r || !r.n) continue; st.gvs.push(r.gv); kesitGv.push(r.gv);
            const isr = new Set((r.yeni || []).filter(e => e.type === 'kesitisaret').map(e => e.id)); if (isr.size) C.doc.ents = C.doc.ents.filter(e => !isr.has(e.id));
            for (const e of C.doc.ents) if (e.gv === r.gv && (e.type === 'baslik' || e.type === 'text') && String(e.s || '').startsWith(`${ic}-${ic} `)) { e.s = `${k.nm}-${k.nm} ` + String(e.s).slice(2 * ic.length + 2); delete e._c; }
            const km = r.km; if (C.doc.set.kesitMeta) delete C.doc.set.kesitMeta[ic];
            if (km) { const hY = C.annoH(mmU('kablo')); for (const t of elE.filter(e => e.type === 'eluh' && e.sys === 'tava')) { const a = t.pts[0], b = t.pts[1], da = (a[0] - km.a[0]) * km.n[0] + (a[1] - km.a[1]) * km.n[1], db = (b[0] - km.a[0]) * km.n[0] + (b[1] - km.a[1]) * km.n[1]; if (da * db > 0 || Math.abs(da - db) < 1e-6) continue; const q = da / (da - db), x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q, c = (x - km.a[0]) * km.u[0] + (y - km.a[1]) * km.u[1]; if (c < km.ub[0] || c > km.ub[2]) continue;
                const w = (t.n || 1) * (+t.w || 100) / 1000, hT = (+t.h || 60) / 1000, x0 = km.q0[0] + c - w / 2, z0 = km.q0[1] + t.z, ly = t.layer, ad = String(t.kod || ''); const ek = C.add(C.newEnt('pline', { pts: [[x0, z0 + hT, 0], [x0, z0, 0], [x0 + w, z0, 0], [x0 + w, z0 + hT, 0]], closed: false, layer: ly, lt: 'CONTINUOUS', gv: r.gv })); if (ek) delete ek.sp; const ty = C.add(C.newEnt('text', { p: [x0 + w + hY * 0.6, z0, 0], h: hY, s: ad + ' ' + (t.el || ''), al: 'L', ann: false, st: 'AAAA', color: YR(), layer: 'EYAZI', gv: r.gv })); if (ty) delete ty.sp; } }
            /* plandaki kesit işareti çizgiye çevrilir (MIMARIPAFTA kesit harflerini kullanılmış saymasın; mekanik ünite paftasıyla aynı) */
            try { const a = Wp(k.a), b = Wp(k.b), sp = Wp(k.sp), u0 = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(u0[0], u0[1]) || 1; let n = [-u0[1] / l, u0[0] / l]; if ((sp[0] - a[0]) * n[0] + (sp[1] - a[1]) * n[1] < 0) n = [-n[0], -n[1]]; const mk = C.makeSectionMark ? C.makeSectionMark([a[0], a[1], 0], [b[0], b[1], 0], [n[0], n[1], 0], k.nm, res.gv) : null;
              if (mk) { delete mk._c; const Pr = C.prims(mk) || []; C.doc.ents = C.doc.ents.filter(e => e !== mk); const P3 = q => [q[0], q[1], 0]; for (const pr of Pr) { const b0 = Object.assign({ gv: res.gv, layer: mk.layer || 'KESIT_ISARET' }, pr.lw ? { lw: pr.lw } : {}, pr.color != null ? { color: pr.color } : {}, pr.lt ? { lt: pr.lt } : {}); let x = null; if (pr.k === 'L') x = C.newEnt('line', Object.assign(b0, { a: P3(pr.a), b: P3(pr.b) })); else if (pr.k === 'P') x = C.newEnt('pline', Object.assign(b0, { pts: pr.pts.map(P3), closed: !!pr.c })); else if (pr.k === 'C') x = C.newEnt('circle', Object.assign(b0, { c: P3(pr.c), r: pr.r })); else if (pr.k === 'S' && C.T.solid) x = C.newEnt('solid', Object.assign(b0, { pts: pr.pts.map(P3) })); else if (pr.k === 'T') x = C.newEnt('text', Object.assign(b0, { p: P3(pr.p), h: pr.h, s: pr.s, rot: (pr.rot || 0) * 180 / Math.PI, al: pr.al || 'MC', ann: false }, pr.st ? { st: pr.st } : {})); if (x) { const y2 = C.add(x); if (y2) delete y2.sp; } } } } catch (er) { console.error('kesit işareti', er); }
            { const b = C.extents(C.doc.ents.filter(e => e.gv === r.gv)); if (b) yK = b[1] - 12; } } }
        /* tablolar / lejant / notlar / detaylar (kâğıt mm → elsema) */
        const gvT = `ELU_${PF.tur}_` + Date.now().toString(36), gvTs = [], bloklar = [];
        const gs = [];
        if (PF.tur === 'guc') { gs.push(['lej1', lejant1(d)]); gs.push(['boru', tablo('GALV. BORULARDAN GEÇEN KABLOLAR', [{ t: 'BORU', w: 22 }, { t: 'KABLO (mm2 NYY-LIYCY)', w: 62 }], BORU_TABLO.map(r => [r[0], r[1]]))]);
          if ((d.kablo || []).length) gs.push(['liste', tablo(`${yapi} — KABLO LİSTESİ`, LISTE_SUTUN, listeSatirlari(d.kablo), { h: (KR().yaziMm || {}).sutun || 2.2 })]); }
        if (PF.tur === 'tav') { const TV = C.elTavaApi, Mt = d.metraj; if (TV && Mt) {
          const sTop = [...Mt.satir.map(x => [String(x.yol), TV.SINIF[x.sinif] || x.sinif, x.olcu, String(x.n), vir(x.L), vir(x.toplam), String(x.parca), String(x.nKablo), '%' + vir(x.dolu * 100, 0)]), ['', '', '', '', 'TOPLAM', vir(Mt.toplamM), String(Mt.satir.reduce((t, x) => t + x.parca, 0)), '', '']];
          gs.push(['tav-metraj', tablo('TAVA ÖLÇÜ VE METRAJ LİSTESİ', [{ t: 'YOL', w: 12 }, { t: 'HAT', w: 24 }, { t: 'GxY (mm)', w: 22 }, { t: 'SIRA', w: 12 }, { t: 'BOY (m)', w: 18 }, { t: 'TOPLAM (m)', w: 22 }, { t: '3 m PARÇA', w: 20 }, { t: 'KABLO', w: 15 }, { t: 'DOLULUK', w: 18 }], sTop, { h: (KR().yaziMm || {}).sutun || 2.2 })]);
          const sEk = Mt.parcalar.map(x => [String(x.poz), x.ad, x.oz, x.birim, String(x.miktar)]), B0 = d.boruMet; let pz = sEk.length; if (B0) { for (const q of B0.boru) sEk.push([String(++pz), 'Galvaniz boru (branş)', q.boru, 'm', vir(q.L)]); if (B0.adaptor) sEk.push([String(++pz), 'Tava çıkış adaptörü', 'boru çapına uygun', 'adet', String(B0.adaptor)]); if (B0.kelepce) sEk.push([String(++pz), 'Boru kelepçesi', 'galvaniz, 1,5 m aralıkla', 'adet', String(B0.kelepce)]); }
          if (d.giris !== 'galeri' && d.nGiris) { const Bc = UK().baca || { dis: 1, ic: 0.8 }; sEk.push([String(++pz), 'Kablo bacası', `${Math.round(Bc.dis * 100)}x${Math.round(Bc.dis * 100)} cm, iç ${Math.round(Bc.ic * 100)}x${Math.round(Bc.ic * 100)} cm, kapaklı`, 'adet', String(d.nGiris)]); }
          gs.push(['tav-ek', tablo('KULLANILAN EK PARÇALAR LİSTESİ', [{ t: 'POZ', w: 11 }, { t: 'MALZEME', w: 52, al: 'L' }, { t: 'ÖZELLİK', w: 62, al: 'L' }, { t: 'BİRİM', w: 14 }, { t: 'MİKTAR', w: 18 }], sEk, { h: (KR().yaziMm || {}).sutun || 2.2 })]);
          for (const q of d.doseme || []) gs.push(['det-doseme', TV.detayDoseme(Object.assign({ ara: UK().tavaAra || 0.2 }, q))]);
          const q0 = (d.doseme || [])[0] || {}; gs.push(['det-ek', TV.detayEk()], ['det-konsol', TV.detayKonsol({ ara: UK().tavaAra || 0.2, wAg: q0.ag && q0.ag.w, wZ: q0.zayif && q0.zayif.w, ag: q0.ag ? q0.ag.w + 'x' + q0.ag.h + ' mm' : '', zayif: q0.zayif ? q0.zayif.w + 'x' + q0.zayif.h + ' mm' : '' })], ['det-lcu', (d.motor || []).some(m => m.tur === 'mikser') ? TV.detayLCU() : null], ['det-cikis', TV.detayCikis()], ['det-giris', TV.detayGiris(d.giris, d.giris === 'galeri' ? UK().galeri : UK().baca)]); } }
        if (PF.tur === 'top') { gs.push(['lej2', lejant2()]); try { if (EL().detayBara) gs.push(['det-bara', EL().detayBara({ ad: 'TB-1' })]); } catch (er) { console.error(er); } try { if (d.topraklama && EL().tabloTopraklama) gs.push(['tbl-top', EL().tabloTopraklama(d.topraklama)]); } catch (er) { console.error(er); } gs.push(['not2', notlar2(d.topraklama)]); }
        if (PF.tur === 'ayd') { gs.push(['lej3', lejant3(d.armKod || 'U-LED36W')]); if (d.bhak) gs.push(['tekhat', tekHat(d.bhak)]); gs.push(['det-arm', detayArmatur(d.armKod || 'U-LED36W', UK().direkH)]); if (d.bhak) gs.push(['not3', notlar3(d)]); }
        let yy = 0; const xT = place[0] + (bb[2] - bb[0]) + 6;
        for (const [tur, g] of gs) { if (!g) continue; const gb = gKutu(g); if (!gb) continue; const p = [xT - gb[0] * kf, Yc + yy - gb[3] * kf]; const gI = `${gvT}_${gvTs.length}`; gvTs.push(gI); st.gvs.push(gI); semaEnt(gI, p, g, tur); yy -= (gb[3] - gb[1]) * kf + 8 * kf; }
        const blok = (gv, ana) => { const b = A.vpBlok(gv, SC, 'Elektrik'); if (b) { b.sc = SC; if (ana) b.ana = true; } return b; };
        if (res.gv) bloklar.push(blok(res.gv, true)); for (const g of kesitGv) bloklar.push(blok(g, true)); for (const g of gvTs) bloklar.push(blok(g, false));
        /* pafta: en az kâğıt (mimari altyapısı) */
        const bl = bloklar.filter(b => b && b.w > 0 && b.h > 0); if (bl.length) {
          const byId = new Map(bl.map(b => [b.gv, b])), Y = Ap.enAzKagit(bl.map(b => ({ id: b.gv, w: b.w, h: b.h, grup: PF.ad })), { antetW: C.antetGen ? C.antetGen() : 0 }), n = Y.paftalar.length;
          Y.paftalar.forEach((P2, i) => { const adN = PF.ad + (n > 1 ? ` (${i + 1}/${n})` : '');
            const gp = C.grpCur; C.grpCur = 'Elektrik'; const Ly = C.newLayout(`ELEKTRİK ALTYAPI — ${yapi} — ${adN}`, P2.kagit, 'L'); C.grpCur = gp;
            Object.assign(Ly, { grp: 'Elektrik', elUnite: u.id, elUniteParca: PF.tur + '_' + i, disPafta: 'Elektrik', size: 'OZEL', pw: P2.pw, ph: P2.ph, orient: 'L', noTitle: false, margin: Object.assign({}, Ap.PAFTA_R2.kenar), antetSutun: P2.antet, kagit: P2.kagit });
            Ly.f = Object.assign(Ly.f || {}, { proje: (Ly.f && Ly.f.proje) || C.doc.set.name || '', baslik: `${yapi} — ${adN}` });
            Ly.vps = P2.ids.map(id => { const b = byId.get(id), q = P2.yer[id]; return Object.assign({ x: q[0], y: q[1], w: b.w, h: b.h, cx: (b.bb[0] + b.bb[2]) / 2, cy: (b.bb[1] + b.bb[3]) / 2, scale: b.sc, gvOnly: b.gv, frame: { on: false }, lock: true, disiplin: 'Elektrik' }, b.ana ? { ana: true } : {}); });
            Ly.f.olcek = C.paftaOlcekYazisi ? C.paftaOlcekYazisi(Ly) : `1/${SC}`;
            if (P2.tasan.length) C.warn(`${Ly.name}: ${P2.tasan.length} çizim pafta yüksekliğine (${P2.ph} mm) sığmıyor; paftada kırpılır.`);
            paf.push(Ly); });
        }
        { const b = C.extents(C.doc.ents.filter(e => (res.gv && e.gv === res.gv) || gvTs.includes(e.gv) || kesitGv.includes(e.gv))); if (b) Yc = b[1] - 12; }
      }
      numarala();
      try { if (C.bolgeDuzenle) C.bolgeDuzenle({ sessiz: true }); } catch (er) { console.error('bölge düzeni', er); }
      { const s = C.doc.set; s.grups = s.grups || ['Mimari', 'Mekanik', 'Statik', 'Elektrik', 'Genel']; if (!s.grups.includes('Elektrik')) s.grups.push('Elektrik'); }
      Object.assign(st, { olcek: SC });
      if ((st.korunan || []).length) C.log(`${yapi}: elle düzeltilmiş olarak işaretli paftalar korundu (işareti kaldırmak için paftayı açıp PAFTAELLE).`);
      return { paf, R, olcek: SC, yapi };
    } finally { C.doc.set.anno = anno0; }
  };
  /* Elektrik pafta numaraları: bina paftaları (el-pafta.js, L.elPafta) ELK-01 …; ünite paftaları onlardan sonra */
  const numarala = () => { const L0 = C.doc.layouts || [], T0 = ['guc', 'tav', 'top', 'ayd'], U0 = [...new Set(L0.filter(q => q.elUnite).map(q => q.elUnite))]; let i = L0.filter(x => x.elPafta).length;
    const P0 = q => +String(q.elUniteParca || '').split('_')[1] || 0; for (const x of L0.filter(q => q.elUnite).slice().sort((a, b) => (U0.indexOf(a.elUnite) - U0.indexOf(b.elUnite)) || (T0.indexOf(turOf(a)) - T0.indexOf(turOf(b))) || (P0(a) - P0(b)))) x.f = Object.assign({}, x.f || {}, { no: 'ELK-' + String(++i).padStart(2, '0') }); };
  C.elUniteNumarala = numarala;
  const numSar = () => { const E = C.EL; if (!E || !E.paftaNumarala || E._euSar) return; const f0 = E.paftaNumarala; E.paftaNumarala = function () { const r = f0.apply(this, arguments); try { numarala(); } catch (er) { console.error(er); } return r; }; E._euSar = true; };

  const secHavuz = async (I, msg) => {
    let u = (C.sel || []).find(havuzMu) || (C.sel || []).map(e => e.bag && C.byId(e.bag)).find(havuzMu);
    if (!u) { const L0 = C.doc.ents.filter(havuzMu); u = L0.length === 1 ? L0[0] : null; }
    if (!u) { const s = await I.sel(msg); u = (s || []).find(havuzMu) || (s || []).map(e => e.bag && C.byId(e.bag)).find(havuzMu); }
    return u;
  };
  /* RAPOR ve "Hesapla (hepsi)": havuzlar da hesaplanır (kullanıcı 21.11.2026: "hesaplamıyor") */
  const raporAc = () => { const st = durum(), L0 = C.doc.ents.filter(e => havuzMu(e) && st[e.id] && st[e.id].motor); if (!L0.length) return false; const tr = x => (window.DIL && window.DIL.t ? window.DIL.t(x) : x), bas = tr('Havuz elektrik raporu');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + bas + '</title><style>body{font:13px/1.5 Arial,sans-serif;color:#111;background:#fff;max-width:1000px;margin:24px auto;padding:0 20px}h2{border-bottom:1px solid #999}table{border-collapse:collapse;width:100%;margin:6px 0 12px}th,td{border:1px solid #999;padding:3px 6px;text-align:left}th{background:#eee}</style></head><body><h1>' + bas + '</h1>' + L0.map(u => raporBolum(((u.code || '') + ' ' + (u.name || '')).trim(), st[u.id], tr)).join('') + '</body></html>';
    const w = window.open('', 'el_rapor_havuz'); if (!w) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = (C.doc.set.name || 'Proje') + '_havuz_elektrik_raporu.html'; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000); C.warn('Açılır pencere engellendi — rapor HTML olarak indirildi.'); return true; } w.document.open(); w.document.write(html); w.document.close(); return true; };
  C.elUniteRapor = raporAc;
  { const E0 = C.EL; if (E0 && E0.raporAc && !E0._eluRapor) { const f0 = E0.raporAc; E0._eluRapor = true; E0.raporAc = function () { const bina = !!(E0.durum && E0.durum()), hv = raporAc(); if (hv && !bina) return true; return f0.apply(this, arguments); }; } }
  const hesapHavuz = () => C.doc.ents.filter(e => havuzMu(e) && tarifli(e));
  const havuzlariHesapla = async () => { numSar(); const H = hesapHavuz(), son = [];
    for (const u of H) { if (!C.doc.ents.some(x => x.bag === u.id && x.type === 'aile')) { C.warn((u.code || '') + ' ünitesinde yerleşmiş mekanik ekipman yok: elektrik hesaplanmadı (önce ANAEKIPMAN).'); continue; } const r = C.toplu ? await C.toplu(() => uret(u)) : await uret(u); if (r) son.push(r); }
    if (!son.length) return son; C.changed(); C.emit('layouts');
    for (const r of son) { const kW = r.R.MS.reduce((t, m) => t + (m.P || 0), 0); C.log('HESAPLA — ' + r.yapi + ': ' + r.R.MS.length + ' motor (' + vir(kW) + ' kW), ' + r.R.KL.length + ' kablo' + (r.R.BH ? ', ' + r.R.ARM.length + ' armatür, BHAK ' + Math.round(r.R.BH.kurulu) + ' W (3x' + r.R.BH.In + 'A, ' + r.R.BH.kablo + ')' : '') + (r.R.TR ? ', topraklama R = ' + vir(r.R.TR.R) + ' Ω' : '') + '; ' + r.paf.length + ' pafta.'); }
    const L0 = son[0].paf[0]; if (L0) { C.layoutIdx = C.doc.layouts.indexOf(L0); C.grpCur = 'Elektrik'; C.setView('layout'); C.emit('layouts'); } raporAc(); return son; };
  /* el-pafta.js komutları sarılır: bina varsa eskisi gibi çalışır, havuzlar ayrıca hesaplanır; yalnız havuz varsa bina akışına hiç girilmez */
  for (const ad of ['ELEKTRIKHESAPLA', 'ELHESAPLA', 'ELEKTRIKHESAP']) { const d = C.cmds && C.cmds[ad]; if (!d || d._eluSar) continue; const f0 = d.fn; d._eluSar = true; d.fn = async function (I) { const Hs = hesapHavuz(), H = Hs.length > 0, bina = binaVarMi(C.doc.ents, new Set(Hs.map(e => e.id))); if (!H || bina) await f0.call(this, I); if (H) await havuzlariHesapla(); }; }
  /* ELEKTRIKRAPOR komutu EL.raporAc'ı çağırır: sarmalayıcı yukarıda */

  C.addCommand(['ELUNITEPAFTA', 'ALTYAPIELEKTRIK', 'ELEKTRIKUNITE', 'ELHAVUZPAFTA'], 'Seçili havuzun (proses ünitesi; önce anaerobik havuz) elektrik projesini Çorlu E-BP düzeninde "Elektrik" grubuna hazırlar: 1) güç, kumanda, enstrüman kablo ve tava planı (motorlar mekanik ekipman listesinden; JB, LCU, kablo tavası, GK / KK / KK-LK kabloları, kesit motor gücünden; kablo boyları genel kablolamada), 2) topraklama planı (halka şerit, çubuklar, TB-1, bara detayı, hesap). Aydınlatma, priz ve anahtar kutusu proje ayarıdır, kapalı başlar (ELUNITEAYD ile açılırsa 3. pafta eklenir). Elektrik nesneleri 3B modelde de görünür. İçinde yaşam olan yapılar için: ELEKTRIKPAFTA.', async (I) => {
    numSar();
    const u = await secHavuz(I, 'Elektrik paftası hazırlanacak havuzu seçin (anaerobik havuz)');
    if (!u) { C.warn('Havuz türünde ünite seçilmedi (şimdilik pafta tarifi olan anaerobik havuz). İçinde yaşam olan yapılar (bekçi binası vb.) için: ELEKTRIKPAFTA. Yapı türünü değiştirmek için: ELYAPITURU.'); return; }
    if (!C.doc.ents.some(x => x.bag === u.id && x.type === 'aile')) C.warn(`${u.code || ''} ünitesinde yerleşmiş mekanik ekipman yok (önce ekipman: ANAEKIPMAN). Paftalar motorsuz hazırlanıyor.`);
    const res = C.toplu ? await C.toplu(() => uret(u)) : await uret(u); if (!res) return;
    C.changed(); C.emit('layouts');
    const L0 = res.paf[0]; if (L0) { C.layoutIdx = C.doc.layouts.indexOf(L0); C.grpCur = 'Elektrik'; C.setView('layout'); C.emit('layouts'); setTimeout(() => { try { C.views.lay.zoomExtents(); } catch (er) { } }, 60); }
    const R = res.R, kW = R.MS.reduce((s, m) => s + (m.P || 0), 0), eks = R.MS.filter(m => m.veriYok).map(m => m.kod);
    raporAc(); C.log(`${res.yapi}: ${res.paf.length} elektrik paftası (1/${res.olcek}) — ${R.MS.length} motor (${vir(kW)} kW), ${R.KL.length} kablo (boylar genel kablolamada)${R.BH ? `, ${R.ARM.length} armatür, BHAK ${Math.round(R.BH.kurulu)} W (3x${R.BH.In}A, ${R.BH.kablo})` : ''}${R.TR ? `, topraklama R = ${vir(R.TR.R)} Ω` : ''}.${eks.length ? ` Güç verisi olmayan: ${eks.join(', ')}.` : ''}${R.uyar.length ? ' ' + R.uyar.join(' ') : ''} Ekipman değişince ELUNITEPAFTA ile yeniden üretin.`);
  });
  C.addCommand(['ELYAPITURU', 'YAPITURU'], 'Seçili yapının elektrik projesi türünü seçer: HAVUZ (proses ünitesi; Çorlu E-BP düzeni, ELUNITEPAFTA) ya da YASAM (içinde yaşam olan yapı; bekçi binası E-BB düzeni, ELEKTRIKPAFTA). ELYAPITURU [HAVUZ|YASAM|OTO]', async (I) => {
    const s = (C.sel && C.sel.length) ? C.sel : await I.sel('Yapıyı seçin'); const x = (s || []).find(e => !e.gv); if (!x) return;
    const a = await I.kw('Elektrik yapı türü', [['H', 'Altyapı: havuz / proses ünitesi (E-BP)'], ['Y', 'Üstyapı: içinde yaşam olan yapı (E-BB)'], ['O', 'Kendiliğinden']], yapiTuru(x) === 'havuz' ? 'Y' : 'H'); if (!a) return;
    if (a === 'H') x.elYapi = 'havuz'; else if (a === 'Y') x.elYapi = 'yasam'; else delete x.elYapi;
    C.changed(); C.log(`${x.code || x.name || x.type}: elektrik yapı türü ${yapiTuru(x) === 'havuz' ? 'HAVUZ (E-BP düzeni, ELUNITEPAFTA)' : 'YAŞAM ALANI (E-BB düzeni, ELEKTRIKPAFTA)'}${x.elYapi ? '' : ' (kendiliğinden)'}.`);
  });
  C.addCommand(['ELUNITEAYD'], 'Havuzlarda aydınlatma, priz ve anahtar kutusu bu projede olsun mu? Kapalıyken havuz elektriğinde bu elemanlar ve aydınlatma paftası yoktur. Değiştirince Hesapla ya da ELUNITEPAFTA ile yeniden üretin.', async (I) => {
    const a = await I.kw('Havuzda aydınlatma, priz ve anahtar', [['K', 'Yok'], ['A', 'Var']], aydinlatmaVar(C.doc.set) ? 'A' : 'K'); if (!a) return; C.doc.set.elUniteAyd = a === 'A'; C.changed(); C.log('Havuzda aydınlatma, priz ve anahtar: ' + (a === 'A' ? 'VAR' : 'YOK') + '. Yeniden üretmek için: ELEKTRIKHESAPLA.');
  });
  /* genel yerleşim aşaması hattın geldiği noktayı buradan verir; galeri / menhol / boru sistemini st.girisler noktalarına bağlar */
  C.elUniteGirisAyarla = (u, hedef) => { if (!u) return; if (Array.isArray(hedef)) u.elGirisHedef = [+hedef[0], +hedef[1]]; else delete u.elGirisHedef; };
  C.addCommand(['ELKABLOGIRIS', 'KABLOGIRIS'], 'Altyapı ünitesine gelen kabloların girişi: KABLO BACASI (Çorlu 100x100 cm, 4xØ100 PVC) ya da KABLO GALERİSİ. Yön: genel yerleşimde hattın geldiği nokta seçilir, yapıya o taraftan girilir; seçilmezse her tava kendi ucundan girer. Galeri, menhol ve boru sisteminin tamamı genel yerleşimde çizilir.', async (I) => {
    const TG = C.elTavaApi, a = await I.kw('Kablo girişi', [['B', 'Kablo bacası'], ['G', 'Kablo galerisi']], TG && TG.kabloGiris(C.doc.set) === 'galeri' ? 'G' : 'B'); if (!a) return; C.doc.set.elKabloGiris = a === 'G' ? 'galeri' : 'baca';
    const u = await secHavuz(I, 'Girişi ayarlanacak havuzu seçin'); if (u) { const y = await I.kw('Yapıya giriş tarafı', [['O', 'Tava ucundan (kendiliğinden)'], ['N', 'Hattın geldiği noktayı seç']], Array.isArray(u.elGirisHedef) ? 'N' : 'O'); if (!y) return; if (y === 'N') { const p = await I.pt('Genel yerleşimde hattın üniteye geldiği nokta'); if (!p) return; C.elUniteGirisAyarla(u, p); } else C.elUniteGirisAyarla(u, null); }
    C.changed(); C.log('Kablo girişi: ' + (a === 'G' ? 'KABLO GALERİSİ' : 'KABLO BACASI') + '.');
    if (C.doc.ents.some(e => !e.gv && e.type === 'eluh')) await havuzlariHesapla();
  });
  C.addCommand(['ELUNITESIL'], 'Seçili havuzun ünite elektrik nesnelerini (kablo, tava, armatür, topraklama) ve elektrik paftalarını siler.', async (I) => {
    const u = await secHavuz(I, 'Havuzu seçin'); if (!u) return; sil_(u); const k = temizle(u); durum()[u.id] = { gvs: k.gvs }; numarala(); C.changed(); C.emit('layouts'); C.log('Ünite elektrik nesneleri ve paftaları silindi.' + (k.korunan.length ? ' Elle düzeltilmiş paftalar korundu.' : ''));
  });
})(typeof window !== 'undefined' ? window.C : null);

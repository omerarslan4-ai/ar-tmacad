/* Çelik çizim kuralı (app/cizim-kural.js → CELIK) örnek paftalardan ölçülen değerlerle ve docs/cizim-kurallari/celik.md ile aynı mı.
   Örnek: test-proje/ÇELİK/GENEL.dwg (Tekla; 15.11.2026'da ölçüldü) — profil sarı, eksen kırmızı kesik-nokta 3 −1 1 −1, gizli kırmızı 2 −2,
   poz no mor 3,0 mm, profil adı sarı 2,5 mm, ölçü çizgisi beyaz yazısı sarı 2,5 mm, başlık yeşil 2,5 mm, aks 4,0 mm.
   Çalıştır: node test/celik-kural.test.js */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
globalThis.C = {};
require(path.join(__dirname, '..', 'app', 'cizim-kural.js'));
const K = C.cizimKural.CELIK, Ky = K.katmanlar;
let n = 0; const ok = (k, m) => { assert.ok(k, m); n++; };

const OLCULEN = { CELIK_PROFIL: [2, 'Continuous'], CELIK_EKSEN: [1, 'CELIK_EKSEN'], CELIK_GIZLI: [1, 'CELIK_GIZLI'], CELIK_BULON: [2, 'Continuous'], CELIK_POZ: [6, 'Continuous'], CELIK_OLCU: [7, 'Continuous'], CELIK_NOT: [7, 'Continuous'], CELIK_BASLIK: [3, 'Continuous'], CELIK_DIGER: [4, 'Continuous'] };
for (const [ad, [renk, tip]] of Object.entries(OLCULEN)) { ok(Ky[ad], ad + ' tabloda'); ok(Ky[ad].renk === renk, `${ad} renk ${Ky[ad].renk} ≠ ${renk}`); ok(Ky[ad].tip === tip, `${ad} çizgi tipi`); }
ok(JSON.stringify(K.cizgiTipi.CELIK_EKSEN) === '[3,-1,1,-1]' && JSON.stringify(K.cizgiTipi.CELIK_GIZLI) === '[2,-2]', 'çizgi tipi desenleri (XKITLINE03 / 02)');
const Y = K.yaziMm; ok(Y.pozNo === 3 && Y.profilAd === 2.5 && Y.olcu === 2.5 && Y.not === 2.5 && Y.baslik === 2.5 && Y.aks === 4, 'yazı yükseklikleri (GENEL.dwg, kullanıcı kararı)');
ok(K.yaziRenk === 2, 'profil adı / ölçü / bulon yazısı sarı');
/* kalınlık renge bağlı (kullanıcı onayı): aynı renk aynı kalınlık */
const RK = { 2: 0.35, 1: 0.18, 7: 0.18, 6: 0.25, 3: 0.35, 4: 0.25 };
for (const [ad, t] of Object.entries(Ky)) ok(RK[t.renk] === t.kal, `${ad}: renk ${t.renk} kalınlığı ${t.kal} ≠ ${RK[t.renk]}`);
const O = K.pozOnek; ok(O.kolon === 'KL' && O.kiris === 'KR' && O.asik === 'AS' && O.gergi === 'GR' && O.yatayCapraz === 'YC' && O.duseyCapraz === 'DC' && O.monoray === 'M-KR', 'poz kısaltmaları (örnek antet)');

/* belge ile tablo aynı */
const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'cizim-kurallari', 'celik.md'), 'utf8');
for (const [ad, t] of Object.entries(Ky)) { const m = new RegExp('\\|\\s*`' + ad + '`\\s*\\|\\s*(\\d+)\\s*\\|[^|]*\\|\\s*([\\d,]+)\\s*\\|').exec(md); ok(m, ad + ' belgede'); ok(+m[1] === t.renk, ad + ' belgede renk'); ok(+m[2].replace(',', '.') === t.kal, ad + ' belgede kalınlık'); }

console.log(`celik-kural: ${n} kontrol geçti`);

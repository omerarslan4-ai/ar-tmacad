/* gorunumler.js: Mimari kesit üretilirken oklu açıklamalar (korkuluk, lento, çatı, mahya) ertelenir ve malzeme açılımından SONRA konur
   (açılım kodlarına binmesin). 84403f0'da bu atama bir yorumun içine düşmüş, hiçbir test yakalamamıştı.
   Çalıştır: node test/gorunumler-okertele.test.js */
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'gorunumler.js'), 'utf8');
let n = 0; const t = (ad, f) => { f(); n++; console.log('✓ ' + ad); };
// satır yorumlarını at (blok yorumlar zaten aynı satırda kalır), sonra atamayı ara
const kod = src.split('\n').map(l => { const i = l.indexOf('//'); return i < 0 ? l : l.slice(0, i); }).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
t('C._okErtele ataması çalışan kodda (yorumda değil)', () => assert.ok(/C\._okErtele\s*=\s*tur\s*===\s*'MIMARI'/.test(kod)));
t('ertelenen oklar açılımdan sonra konuyor (C._okErtele okunuyor)', () => assert.ok((kod.match(/C\._okErtele/g) || []).length >= 2));
console.log(`\n${n} test geçti.`);

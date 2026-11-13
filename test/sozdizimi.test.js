/* Program dosyalarının (app/*.js, app/hesap/*.js, araclar/*.js) sözdizimi denetimi.
   Tarayıcıda tek bir dosyadaki yazım hatası o modülü sessizce devre dışı bırakır; bu test onu commit'ten önce yakalar.
   Çalıştır: node test/sozdizimi.test.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const kok = path.join(__dirname, '..'); let n = 0; const bozuk = [];
for (const d of ['app', 'app/hesap', 'araclar']) {
  const dir = path.join(kok, d); if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) { if (!f.endsWith('.js')) continue;
    const s = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^#!.*/, '');
    try { new vm.Script(s, { filename: d + '/' + f }); n++; } catch (e) { bozuk.push(d + '/' + f + ' — ' + e.message); } }
}
assert.deepStrictEqual(bozuk, [], 'Sözdizimi hatası:\n' + bozuk.join('\n'));
console.log(`✓ ${n} dosyanın sözdizimi doğru.\n\n1 test geçti.`);

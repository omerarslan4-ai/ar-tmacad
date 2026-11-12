/* Tüm testleri sırayla çalıştırır ve özet verir (denetçi ajanın ve elle kontrolün tek komutu).
   Çalıştır: node araclar/tum-testler.js            → test/ altındaki bütün *.test.js
             node araclar/tum-testler.js statik     → adında "statik" geçen testler
   Çıkış kodu: hepsi geçtiyse 0, biri bile kaldıysa 1. */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const kok = path.join(__dirname, '..'), dizin = path.join(kok, 'test');
const filtre = process.argv[2] || '';
const dosyalar = fs.readdirSync(dizin).filter(f => f.endsWith('.test.js') && f.includes(filtre)).sort();
if (!dosyalar.length) { console.log('Eşleşen test yok: ' + (filtre || '(boş klasör)')); process.exit(1); }

const kalan = [];
for (const f of dosyalar) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dizin, f)], { cwd: kok, encoding: 'utf8', timeout: 10 * 60 * 1000 });
  const sn = ((Date.now() - t0) / 1000).toFixed(1);
  if (r.status === 0) { console.log('✓ ' + f + '  (' + sn + ' sn)'); continue; }
  kalan.push(f);
  console.log('✗ ' + f + '  (' + sn + ' sn)' + (r.error ? '  ' + r.error.message : ''));
  const son = ((r.stdout || '') + (r.stderr || '')).trim().split(/\r?\n/).slice(-15);
  for (const s of son) console.log('    ' + s);
}
console.log('\n' + (dosyalar.length - kalan.length) + ' / ' + dosyalar.length + ' test dosyası geçti.');
if (kalan.length) { console.log('Kalanlar: ' + kalan.join(', ')); process.exit(1); }

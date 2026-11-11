/* ArıtmaCAD — ortak dil (çeviri) altyapısı: tüm disiplinler için
   - Seçili dil localStorage 'aritmacad.dil' anahtarında tutulur (ArıtmaCAD ve hesap pencereleri ortak kullanır).
   - Her disiplin kendi sözlüğünü ekler:  DIL.ekle('en', 'English', [[türkçe, çeviri], ...], { kelime: çeviri })
       · '#' sayı yer tutucusudur (12, 2.50, -3, 1992 …); çeviride '#' sırayla, {1} {2} … numarayla doldurulur.
       · Önce tam eşleşme, sonra metin içi ifade eşleşmesi (uzundan kısaya), en son tek kelime sözlüğü denenir.
   - DIL.t(metin) → seçili dile çevirir (Türkçe seçiliyse metni aynen döndürür).
   - DIL.cevirDom(kök), DIL.cevirSpec(çizim listesi) yardımcıları; DIL.dinle(fn) dil değişince çağrılır. */
(function () {
  'use strict';
  const KEY = 'aritmacad.dil', D = window.DIL = window.DIL || {};
  D.diller = Object.assign({ tr: 'Türkçe' }, D.diller || {});
  D.sz = D.sz || {};
  let kod = 'tr'; try { kod = localStorage.getItem(KEY) || 'tr'; } catch (e) { }
  const cache = new Map(), dinleyici = [];
  const bildir = () => { cache.clear(); dinleyici.forEach(f => { try { f(kod); } catch (e) { console.error('DIL', e); } }); };
  D.kod = () => kod;
  D.set = k => { const y = D.diller[k] ? k : 'tr'; if (y === kod) return; kod = y; try { localStorage.setItem(KEY, kod); } catch (e) { } bildir(); };
  D.dinle = f => { dinleyici.push(f); };
  window.addEventListener('storage', e => { if (e.key === KEY && (e.newValue || 'tr') !== kod) { kod = e.newValue || 'tr'; bildir(); } });

  const NUM = '([+\\-−]?\\d+(?:[.,]\\d+)*)', HARF = '\\p{L}\\p{N}';
  const kac = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = (a, tam) => { const src = a.split('#').map(kac).join(NUM); return tam ? new RegExp('^' + src + '$', 'u') : new RegExp('(?<![' + HARF + '])' + src + '(?![' + HARF + '])', 'gu'); };
  const ust = s => s.toLocaleUpperCase('tr');
  D.ekle = (k, ad, ciftler, kelimeler) => {
    const z = D.sz[k] = D.sz[k] || { tam: new Map(), sab: [], kel: new Map() }; D.diller[k] = ad || D.diller[k] || k;
    const bir = (a, b) => {
      if (!a || b == null) return;
      if (a.includes('#')) z.sab.push({ n: a.length, tam: rx(a, true), ic: rx(a, false), en: b });
      else { if (!z.tam.has(a)) z.tam.set(a, b); z.sab.push({ n: a.length, ic: rx(a, false), en: b, duz: true }); }
    };
    for (const [a, b] of ciftler || []) { bir(a, b); const A = ust(a); if (A !== a && a.length > 3 && a.length <= 70) bir(A, b.toUpperCase()); }
    z.sab.sort((x, y) => y.n - x.n);
    for (const [a, b] of Object.entries(kelimeler || {})) z.kel.set(a.toLocaleLowerCase('tr'), b);
    cache.clear();
  };
  const doldur = (en, m) => { let i = 0; return en.replace(/\{(\d)\}|#/g, (x, d) => (d ? (m[+d] || '') : (m[++i] != null ? m[i] : ''))); };
  const TRH = /[ÇĞİÖŞÜçğıöşü]/;
  const tek = (z, s) => {
    s = s.replace(/\u00a0/g, ' '); const c = s.trim(); if (!c || !/\p{L}/u.test(c)) return s;
    const bas = s.slice(0, s.indexOf(c)), son = s.slice(s.indexOf(c) + c.length);
    let r = z.tam.get(c);
    if (r == null) for (const p of z.sab) { if (!p.tam) continue; const m = c.match(p.tam); if (m) { r = doldur(p.en, m); break; } }
    if (r == null) {
      r = c;
      for (const p of z.sab) { p.ic.lastIndex = 0; if (!p.ic.test(r)) continue; p.ic.lastIndex = 0; r = r.replace(p.ic, (...m) => (p.duz ? p.en : doldur(p.en, m))); }
      r = r.replace(/\p{L}+/gu, w => { const lw = w.toLocaleLowerCase('tr'), t = z.kel.get(lw); if (t == null) return w; if (!TRH.test(w) && w.length < 3) return w;
        return w.length > 1 && w === ust(w) ? t.toUpperCase() : /^\p{Lu}/u.test(w) ? t.charAt(0).toUpperCase() + t.slice(1) : t; });
    }
    return bas + r + son;
  };
  D.t = s => {
    if (kod === 'tr' || s == null) return s; const z = D.sz[kod]; if (!z) return s;
    s = String(s); const ck = kod + '\u0001' + s; if (cache.has(ck)) return cache.get(ck);
    const r = s.split('\n').map(x => tek(z, x)).join('\n'); if (cache.size > 20000) cache.clear(); cache.set(ck, r); return r;
  };
  // çizim listesi (statik pafta özellikleri: T.s, D.txt, K.txt)
  D.cevirSpec = spec => { if (kod === 'tr' || !spec) return spec; for (const e of spec) { if (e.k === 'T' && e.s) e.s = D.t(e.s); else if ((e.k === 'D' || e.k === 'K') && e.txt) e.txt = D.t(e.txt); } return spec; };
  // HTML: metin düğümleri + placeholder/title (özgün Türkçe saklanır, dil değişince geri dönülebilir)
  const ozgun = new WeakMap();
  D.cevirDom = kok => {
    if (!kok) return; const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { if (n.parentNode && /^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName)) continue; if (!ozgun.has(n)) ozgun.set(n, n.nodeValue); const o = ozgun.get(n); const y = kod === 'tr' ? o : D.t(o); if (n.nodeValue !== y) n.nodeValue = y; }
    kok.querySelectorAll && kok.querySelectorAll('[title],[placeholder]').forEach(el => { for (const a of ['title', 'placeholder']) { if (!el.hasAttribute(a)) continue; const k2 = '_dil_' + a; if (el[k2] == null) el[k2] = el.getAttribute(a); el.setAttribute(a, kod === 'tr' ? el[k2] : D.t(el[k2])); } });
  };
})();

/* ArıtmaCAD — PAFTA PLOT / PDF SAYFASI (ayrı modül)
   PAFTAPDF (STATIKPDF): statik paftalarını (ya da tüm düzenleri) bir plot sayfasında listeler.
   Her pafta kendi kağıt ölçüsünde (A0, A1, özel genişlik × yükseklik) ayrı ayrı PDF yapılır;
   istenirse tümü tek PDF'te, her sayfa kendi ölçüsünde. */
(function (C) {
  'use strict';
  const xml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const kagit = (w, h) => { const a = Math.max(w, h), b = Math.min(w, h); const iso = Object.entries(C.PAPER || {}).find(([, d]) => Math.abs(d[0] - a) < 2 && Math.abs(d[1] - b) < 2); return iso ? iso[0] : 'Özel'; };
  const dosyaAdi = s => String(s).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();

  C.addCommand(['PAFTAPDF', 'STATIKPDF', 'PLOTSAYFASI'], 'Paftaları kendi kağıt ölçülerinde ayrı ayrı PDF yapmak için plot sayfası açar (STATIK: statik paftaları | TUMU: tüm düzenler)', async (I) => {
    const tum = C.doc.layouts || []; if (!tum.length) { C.warn('Düzen (pafta) yok. Önce statik pencerede "Çizime aktar".'); return; }
    const varS = tum.some(L => L.statikDsi);
    const kap = varS ? await I.kw('Paftalar', [['STATIK', 'Statik paftaları'], ['TUMU', 'Tüm düzenler']], 'STATIK') : 'TUMU';
    const mode = await I.kw('Renk', [['R', 'Renkli'], ['S', 'Siyah-beyaz']], 'R');
    const ls = (kap === 'STATIK' ? tum.filter(L => L.statikDsi).sort((a, b) => (a.statikIdx || 0) - (b.statikIdx || 0)) : tum);
    const sayfalar = [];
    for (const L of ls) { try { const r = C.layoutSvg(L, { mono: mode === 'S' }); sayfalar.push({ ad: L.name, svg: r.svg, w: r.w, h: r.h, k: kagit(r.w, r.h) }); } catch (e) { C.warn(`${L.name}: çizilemedi (${e.message})`); } }
    if (!sayfalar.length) return;
    const proje = C.doc.set.name || 'proje';
    const win = window.open('', '_blank'); if (!win) { C.warn('Açılır pencere engellendi: tarayıcıda bu sayfa için açılır pencerelere izin verin.'); return; }
    const veri = JSON.stringify(sayfalar.map(p => ({ ad: dosyaAdi(proje + ' - ' + p.ad), svg: p.svg, w: p.w, h: p.h, k: p.k })));
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${xml(proje)} — pafta plot sayfası</title><style>
      body{font:14px system-ui,Segoe UI,sans-serif;margin:0;background:#eef1f3;color:#13242b}
      header{background:#13242b;color:#fff;padding:14px 22px}header h1{margin:0;font-size:18px}header p{margin:4px 0 0;opacity:.8;font-size:13px}
      main{padding:18px 22px;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
      .k{background:#fff;border-radius:10px;box-shadow:0 1px 4px #0002;padding:12px;display:flex;flex-direction:column;gap:8px}
      .k .on{background:#f7f7f7;border:1px solid #ddd;height:190px;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .k .on svg{max-width:100%;max-height:100%;height:auto;width:auto;background:#fff}
      .k b{font-size:13px}.k small{color:#566a71}
      button{background:#0b6e8a;color:#fff;border:0;border-radius:7px;padding:9px 14px;font-size:14px;cursor:pointer}button:hover{background:#095a71}
      .ust{display:flex;gap:10px;align-items:center;padding:12px 22px;background:#fff;border-bottom:1px solid #d5dde0}
    </style></head><body>
    <header><h1>Pafta plot sayfası — ${xml(proje)}</h1><p>Her pafta kendi kağıt ölçüsünde açılır. Yazdır penceresinde <b>Hedef: PDF olarak kaydet</b>, <b>Kenar boşlukları: Yok</b>, <b>Ölçek: Varsayılan (%100)</b> seçin; kağıt ölçüsü paftadan otomatik gelir.</p></header>
    <div class="ust"><button id="hepsi">Tümünü tek PDF (her sayfa kendi ölçüsünde)</button><small>${sayfalar.length} pafta</small></div>
    <main id="m"></main>
    <script>
      const P = ${veri.replace(/<\/script/gi, '<\\/script')};
      const m = document.getElementById('m');
      const sayfa = (liste, baslik) => {
        const w = window.open('', '_blank'); if (!w) { alert('Açılır pencere engellendi.'); return; }
        const css = liste.map((p, i) => '@page s' + i + '{size:' + p.w + 'mm ' + p.h + 'mm;margin:0}.s' + i + '{page:s' + i + ';width:' + p.w + 'mm;height:' + p.h + 'mm}').join('');
        w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + baslik.replace(/</g, '') + '</title><style>@page{size:' + liste[0].w + 'mm ' + liste[0].h + 'mm;margin:0}' + css + 'html,body{margin:0;background:#fff}.sf{overflow:hidden;break-after:page;page-break-after:always}.sf:last-child{break-after:auto;page-break-after:auto}.sf svg{display:block;width:100%;height:100%}</style></head><body>' + liste.map((p, i) => '<div class="sf s' + i + '">' + p.svg + '</div>').join('') + '</body></html>');
        w.document.close(); setTimeout(() => { try { w.focus(); w.print(); } catch (e) { } }, 600);
      };
      P.forEach((p, i) => {
        const d = document.createElement('div'); d.className = 'k';
        d.innerHTML = '<div class="on">' + p.svg + '</div><b>' + p.ad.replace(/</g, '&lt;') + '</b><small>' + Math.round(p.w) + ' × ' + Math.round(p.h) + ' mm · ' + (p.k === 'Özel' ? 'özel ölçü' : p.k) + '</small><button>PDF yap</button>';
        d.querySelector('button').onclick = () => sayfa([p], p.ad);
        m.appendChild(d);
      });
      document.getElementById('hepsi').onclick = () => sayfa(P, ${JSON.stringify(dosyaAdi(proje + ' - paftalar'))});
    <\/script></body></html>`);
    win.document.close();
    C.log(`${sayfalar.length} pafta plot sayfasında (${sayfalar.map(p => p.k === 'Özel' ? Math.round(p.w) + '×' + Math.round(p.h) : p.k).join(', ')}). Her paftanın "PDF yap" düğmesi o paftayı kendi ölçüsünde yazdırma penceresinde açar.`);
  }, { noUndo: true });

  // şerit: Hesap → Yapı paneline ve Düzen sekmesine düğme
  try {
    const ekle = (tabAd, panelAd) => { const tab = C.ribbon && C.ribbon.tabs && C.ribbon.tabs.find(t => t[0] === tabAd), pn = tab && tab[1].find(p => p[0] === panelAd); if (pn && !pn[1].some(b => b.cmd === 'PAFTAPDF')) { pn[1].push({ cmd: 'PAFTAPDF', t: 'Pafta PDF', i: 'print' }); return true; } return false; };
    if (ekle('Hesap', 'Yapı')) C.ribbon.render();
  } catch (er) { console.error('PAFTAPDF şerit', er); }
})(window.C);

/* ArıtmaCAD — 3B DİSİPLİN GÖRÜNÜMÜ
   3B üst çubuğunda "Disiplin" seçimi: Tümü / Mimari / Statik / Mekanik / Elektrik.
   Her nesne kategorisine ayrılır (BETON, MIMARI, MEKANIK, ELEKTRIK, DONATI — paftadaki disiplin şablonlarıyla aynı ayrım)
   ve seçilen disipline göre normal, saydam (röntgen) ya da gizli çizilir.
   Statik: beton röntgen (yarı saydam), donatı tam görünür; mekanik / elektrik gizli.
   Donatı (3B demirler) yalnız Statik'te görünür. Komut: DISIPLIN3B [TUMU|MIMARI|STATIK|MEKANIK|ELEKTRIK] */
(function (C) {
  'use strict';
  if (typeof document === 'undefined') return;
  const MODLAR = {
    TUMU: { ad: 'Tümü', BETON: 1, MIMARI: 1, MEKANIK: 1, ELEKTRIK: 1, DONATI: 0 },
    MIMARI: { ad: 'Mimari', BETON: 1, MIMARI: 1, MEKANIK: 0.35, ELEKTRIK: 0, DONATI: 0 },
    STATIK: { ad: 'Statik', BETON: 0.22, MIMARI: 0.08, MEKANIK: 0, ELEKTRIK: 0, DONATI: 1 },
    MEKANIK: { ad: 'Mekanik', BETON: 0.25, MIMARI: 0.12, MEKANIK: 1, ELEKTRIK: 0, DONATI: 0 },
    ELEKTRIK: { ad: 'Elektrik', BETON: 0.2, MIMARI: 0.12, MEKANIK: 0.3, ELEKTRIK: 1, DONATI: 0 },
  };
  C.DISIPLIN3B = MODLAR;
  if (!C.state.dis3b) { try { C.state.dis3b = localStorage.getItem('aritmacad.dis3b') || 'TUMU'; } catch (e) { C.state.dis3b = 'TUMU'; } }
  const kat = e => (C.gorunumKategori ? C.gorunumKategori(e) : null);
  /* nesnenin 3B çarpanı: 1 normal, 0 gizli, arası saydam */
  C.dis3bAlfa = e => { const m = MODLAR[C.state.dis3b] || MODLAR.TUMU, k = kat(e); return k ? (m[k] != null ? m[k] : 1) : 1; };

  /* saydamlık: mevcut nesne saydamlığıyla çarpılır */
  { const a0 = C.entAlpha || (e => 1); C.entAlpha = e => { const f = C.dis3bAlfa(e); return (a0(e) == null ? 1 : a0(e)) * (f > 0 ? f : 1); }; }

  /* 3B yapım: gizlenecekleri süz (görünüşler gorunus.js tarafından zaten süzülür) */
  const sar = () => {
    const v3 = C.views && C.views.v3; if (!v3 || !v3.build || v3._dis3b) return !!(v3 && v3._dis3b);
    const b0 = v3.build.bind(v3);
    v3.build = function () { const all = C.doc.ents; if (!all.some(e => C.dis3bAlfa(e) <= 0)) return b0.apply(this, arguments); C.doc.ents = all.filter(e => C.dis3bAlfa(e) > 0); try { return b0.apply(this, arguments); } finally { C.doc.ents = all; } };
    if (v3.snapAt) { const s0 = v3.snapAt.bind(v3); v3.snapAt = function () { const all = C.doc.ents; C.doc.ents = all.filter(e => C.dis3bAlfa(e) > 0); try { return s0.apply(this, arguments); } finally { C.doc.ents = all; } }; }
    v3._dis3b = true; return true;
  };
  { let n = 0; const t = setInterval(() => { if (sar() || ++n > 40) clearInterval(t); }, 250); }

  const uygula = m => {
    if (!MODLAR[m]) return; C.state.dis3b = m; try { localStorage.setItem('aritmacad.dis3b', m); } catch (e) { }
    for (const e of C.doc.ents) if (e._c) delete e._c.t3; // önbellek
    const v3 = C.views && C.views.v3; if (v3) { v3.needBuild = true; v3.dirty = true; }
    const s = document.querySelector('#v3dis'); if (s && s.value !== m) s.value = m;
    C.changed && C.changed();
  };
  C.dis3bSec = uygula;

  /* 3B üst çubuğuna seçici */
  const ctl = document.querySelector('#view3dCtl');
  if (ctl && !document.querySelector('#v3dis')) {
    const l = document.createElement('label'); l.title = '3B disiplin görünümü: Statik seçilince beton röntgen olur, demirler görünür; diğer disiplinlerde demirler gizlenir';
    l.innerHTML = `Disiplin <select id="v3dis">${Object.entries(MODLAR).map(([k, v]) => `<option value="${k}">${v.ad}</option>`).join('')}</select>`;
    const ref = ctl.querySelector('#v3persp'); if (ref && ref.parentElement) ctl.insertBefore(l, ref.parentElement); else ctl.appendChild(l);
    const s = l.querySelector('select'); s.value = C.state.dis3b; s.onchange = () => uygula(s.value);
  }

  C.addCommand(['DISIPLIN3B', '3BDISIPLIN', 'D3B'], '3B disiplin görünümü: TUMU, MIMARI, STATIK (beton röntgen + donatı), MEKANIK, ELEKTRIK', async (I) => {
    const m = await I.kw('Disiplin', Object.entries(MODLAR).map(([k, v]) => [k, v.ad]), C.state.dis3b);
    if (m) { uygula(m); C.log('3B disiplin: ' + MODLAR[m].ad + (m === 'STATIK' ? ' — beton röntgen, donatılar görünür.' : '.')); }
  }, { noUndo: true });
})(window.C);

/* ArıtmaCAD — sağ panel (Sohbet / Katmanlar / Eklentiler): Sabit · Otomatik gizlen · Kapalı (kenara kaydırarak kapat) */
(function (C) {
  'use strict';
  if (typeof document === 'undefined') return;
  const $ = s => document.querySelector(s), app = $('#app'), side = $('#side'); if (!app || !side) return;
  const st = document.createElement('style');
  st.textContent = `
#app.sideauto{grid-template-columns:76px 1fr 0}#app.sideauto #bottom{grid-column:1 / -1}
#app.sideauto #side{position:fixed;right:0;top:44px;bottom:0;width:370px;z-index:60;transform:translateX(calc(100% - 18px));transition:transform .18s ease;box-shadow:-6px 0 18px rgba(0,0,0,.35)}
#app.sideauto #side.peek{transform:none}
#side{position:relative}
#sideStrip{display:none;position:absolute;left:0;top:0;bottom:0;width:18px;background:var(--panel2);border-right:1px solid var(--line);cursor:pointer;z-index:2;writing-mode:vertical-rl;font-size:11px;color:var(--mut);align-items:center;justify-content:center;gap:10px;letter-spacing:.5px}
#app.sideauto #side:not(.peek) #sideStrip{display:flex}
#sideGrip{position:absolute;left:-3px;top:0;bottom:0;width:7px;cursor:ew-resize;z-index:3}
#sideGrip:hover{background:rgba(31,111,255,.35)}
#sideCtl{display:flex;gap:3px;margin-left:auto}#sideCtl button{padding:2px 7px;font-size:12px}#sideCtl button.on{background:var(--acc,#1f6fff);color:#fff}
#sideTab{display:none;position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:60;writing-mode:vertical-rl;padding:10px 4px;border-radius:7px 0 0 7px;font-size:12px;border-right:0;cursor:pointer}
`;
  document.head.appendChild(st);
  // kontroller
  const tabs = $('#sideTabs'); tabs.style.display = 'flex'; tabs.style.alignItems = 'center';
  const ctl = document.createElement('span'); ctl.id = 'sideCtl';
  ctl.innerHTML = '<button id="spPin" title="Sabit / otomatik gizlen">📌</button><button id="spClose" title="Paneli kapat (kenara kaydır)">»</button>';
  tabs.appendChild(ctl);
  const strip = document.createElement('div'); strip.id = 'sideStrip'; strip.innerHTML = '◀ <span>SOHBET · KATMANLAR</span>'; side.appendChild(strip);
  const grip = document.createElement('div'); grip.id = 'sideGrip'; grip.title = 'Sağa sürükleyerek kapatın'; side.appendChild(grip);
  const tab = document.createElement('button'); tab.id = 'sideTab'; tab.textContent = '◀ Sohbet · Katmanlar'; tab.title = 'Paneli aç'; document.body.appendChild(tab);

  const resize = () => setTimeout(() => { try { for (const v of Object.values(C.views || {})) if (v && v.resize && !v.failed) v.resize(); } catch (e) { } }, 220);
  let mode = 'sabit'; try { mode = localStorage.getItem('aritmacad.sideMode') || (localStorage.getItem('aritmacad.noside') === '1' ? 'kapali' : 'sabit'); } catch (e) { }
  const setMode = (m, quiet) => {
    mode = m; try { localStorage.setItem('aritmacad.sideMode', m); localStorage.setItem('aritmacad.noside', m === 'kapali' ? '1' : '0'); } catch (e) { }
    app.classList.toggle('noside', m === 'kapali'); app.classList.toggle('sideauto', m === 'oto'); side.classList.remove('peek'); side.style.transform = '';
    $('#spPin').classList.toggle('on', m === 'sabit'); $('#spPin').title = m === 'sabit' ? 'Sabit — tıklayın: otomatik gizlensin' : 'Otomatik gizleniyor — tıklayın: sabitle';
    const b = $('#btnSide'); if (b) b.classList.toggle('on', m !== 'kapali');
    tab.style.display = m === 'kapali' ? 'block' : 'none';
    resize(); if (!quiet) C.log(m === 'sabit' ? 'Sağ panel sabit.' : m === 'oto' ? 'Sağ panel otomatik gizleniyor: sağ kenardaki şeride gelince açılır.' : 'Sağ panel kapatıldı: sağ kenardaki "Sohbet · Katmanlar" sekmesiyle açılır.');
  };
  C.sidePanelMode = setMode;
  $('#spPin').onclick = () => setMode(mode === 'sabit' ? 'oto' : 'sabit');
  $('#spClose').onclick = () => setMode('kapali');
  tab.onclick = () => setMode('sabit');
  const b0 = $('#btnSide'); if (b0) b0.onclick = () => setMode(mode === 'kapali' ? 'sabit' : 'kapali');
  C.toggleSide = force => setMode(force === true ? 'sabit' : force === false ? 'kapali' : mode === 'kapali' ? 'sabit' : 'kapali', true);
  // otomatik gizlen: şeride gelince aç, ayrılınca kapat (yazı yazarken açık kalır)
  let tm = null;
  const busy = () => side.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  side.addEventListener('mouseenter', () => { if (mode !== 'oto') return; clearTimeout(tm); side.classList.add('peek'); });
  side.addEventListener('mouseleave', () => { if (mode !== 'oto') return; clearTimeout(tm); tm = setTimeout(() => { if (!busy() && !side.matches(':hover')) side.classList.remove('peek'); }, 700); });
  strip.onclick = () => side.classList.add('peek');
  document.addEventListener('focusout', () => { if (mode === 'oto') setTimeout(() => { if (!busy() && !side.matches(':hover')) side.classList.remove('peek'); }, 400); });
  // kenara kaydırarak kapat: sol kenardaki tutamacı sağa sürükle
  let drag = null;
  grip.addEventListener('pointerdown', e => { grip.setPointerCapture(e.pointerId); drag = { x0: e.clientX }; side.style.transition = 'none'; e.preventDefault(); });
  grip.addEventListener('pointermove', e => { if (!drag) return; const dx = Math.max(0, e.clientX - drag.x0); side.style.transform = `translateX(${dx}px)`; if (mode === 'sabit') { side.style.position = 'relative'; } });
  grip.addEventListener('pointerup', e => {
    if (!drag) return; const dx = e.clientX - drag.x0; drag = null; side.style.transition = ''; side.style.transform = '';
    if (dx > 90) setMode('kapali');
  });
  // dokunmatik: panelde sağa kaydırma
  let tx = null;
  side.addEventListener('touchstart', e => { if (e.touches.length === 1) tx = e.touches[0].clientX; }, { passive: true });
  side.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (dx > 120) setMode('kapali'); }, { passive: true });
  setMode(mode, true);
  C.addCommand(['PANEL', 'SAGPANEL', 'SIDEPANEL'], 'Sağ panel: PANEL SABIT | OTO (otomatik gizlen) | KAPAT', async I => {
    const m = await I.kw('Sağ panel', [['SABIT', 'Sabit'], ['OTO', 'Otomatik gizlen'], ['KAPAT', 'Kapat']], mode === 'sabit' ? 'OTO' : 'SABIT');
    if (m) setMode(m === 'SABIT' ? 'sabit' : m === 'OTO' ? 'oto' : 'kapali');
  }, { noUndo: true });
})(window.C);

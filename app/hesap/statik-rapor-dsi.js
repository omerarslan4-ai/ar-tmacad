/* ArıtmaCAD — STATİK: DSİ "STATİK RAPOR" biçiminde hesap raporu
   Firma rapor düzeni (ÇOKAL AAT SR örneği): kapak, içindekiler, 1 Genel, 2 Tasarım kriterleri (+ zemin taşıma gücü),
   3 Malzemeler, 4 Çatlak kontrolü + paspayı, 5 Yük kombinasyonları (üst yapı + su tutucu), 6 Düşey yükler, 7 Yanal yükler,
   8 Statik hesaplar (yapı ayracı, TBDY 16.12 yük şeması, M diyagramları, k2–k3 tablolu betonarme hesabı + çatlak,
   zemin gerilme kontrolü, yüzme tahkiki), 9 Yararlanılan kaynaklar. Birimler: ton, t·m, ton/m².
   statik.html'deki rapor() fonksiyonunun yerine geçer (Rapor biçimi: DSİ / Eski seçilebilir). */
'use strict';
(function () {
  const P = window.STATIK, G0 = 9.80665, tf = v => v / G0; // kN → tf
  const n2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d)), esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eskiRapor = window.rapor;
  const RAP0 = { bicim: 'DSI', kod: 'T-101', il: '', ilce: '', kapak: 'T.C.\nDEVLET SU İŞLERİ\nGENEL MÜDÜRLÜĞÜ', dd: 'DD-2', bks: 'BKS-3', zs: 'ZC', SS: '', S1: '', FS: '', F1: '', SD1: '', PGA: '', PGV: '', nQ: 0.8, kar: 'III. Bölge', qt: '', analiz: 'Eşdeğer Statik Deprem Analizi' };
  const RAP = () => { S.rap = Object.assign({}, RAP0, S.rap || {}); return S.rap; };

  /* ---------- form: rapor bilgileri ---------- */
  const formEk = () => {
    const f = document.querySelector('#form'); if (!f || f.querySelector('#rapDsi')) return;
    const r = RAP(), alan = (k, t, w) => `<label class="f${w ? ' full' : ''}">${t}<input data-rap="${k}" value="${esc(r[k])}"></label>`;
    f.insertAdjacentHTML('beforeend', `<details class="sec" id="rapDsi"><summary>Rapor bilgileri (DSİ statik rapor biçimi)</summary><div class="body">
      <label class="f full">Rapor biçimi<select data-rap="bicim"><option value="DSI"${r.bicim === 'DSI' ? ' selected' : ''}>DSİ statik rapor (firma formatı)</option><option value="ESKI"${r.bicim !== 'DSI' ? ' selected' : ''}>Eski kısa rapor</option></select></label>
      ${alan('kod', 'Yapı kodu (T-101)')}${alan('zs', 'Yerel zemin sınıfı')}${alan('il', 'İl')}${alan('ilce', 'İlçe')}
      ${alan('dd', 'Deprem düzeyi')}${alan('bks', 'Bina kullanım sınıfı')}${alan('SS', 'S<sub>S</sub>')}${alan('S1', 'S<sub>1</sub>')}${alan('FS', 'F<sub>S</sub>')}${alan('F1', 'F<sub>1</sub>')}
      ${alan('SD1', 'S<sub>D1</sub> (boş: S1·F1)')}${alan('PGA', 'PGA [g]')}${alan('PGV', 'PGV [cm/s]')}${alan('nQ', 'Hareketli yük katsayısı n')}
      ${alan('kar', 'Kar bölgesi')}${alan('qt', 'Taşıma gücü q<sub>t</sub> t/m² (boş: σ<sub>zem</sub>)')}
      <label class="f full">Döşeme mesnet kabulü<select data-tas="dosemeMesnet"><option value="A"${S.tas.dosemeMesnet !== 'Z' ? ' selected' : ''}>Perdelere ankastre (döşeme–perde birleşimi ankastre detaylanır)</option><option value="Z"${S.tas.dosemeMesnet === 'Z' ? ' selected' : ''}>Mafsallı + ankastre zarfı (eski)</option></select></label>
      <label class="f full">Kapak üst yazısı (satır başına bir satır)<textarea data-rap="kapak" rows="3" style="width:100%;font:13px var(--f-body)">${esc(r.kapak)}</textarea></label>
      <p class="hint full">S<sub>DS</sub>, r ve zemin değerleri "Deprem" ve "Zemin" bölümlerinden alınır. S<sub>S</sub>–F<sub>S</sub> yalnız rapora yazılır.</p></div></details>`);
    f.querySelectorAll('[data-tas]').forEach(el => el.onchange = () => { S.tas[el.dataset.tas] = el.value; changed(); });
    f.querySelectorAll('[data-rap]').forEach(el => el.onchange = () => { const r2 = RAP(); r2[el.dataset.rap] = el.value; save(); if (R) rapor(); });
  };
  const bf0 = window.buildForm; if (bf0) window.buildForm = buildForm = function () { const x = bf0.apply(this, arguments); formEk(); return x; };
  formEk();

  /* ---------- yardımcılar ---------- */
  const tab = (rows, cls) => `<table class="${cls || ''}">${rows.join('')}</table>`;
  const tr = (...c) => `<tr>${c.join('')}</tr>`, td = (s, a = '') => `<td ${a}>${s}</td>`, th = (s, a = '') => `<th ${a}>${s}</th>`;
  const OK = '√', durum = ok => ok ? `<b class="uy">UYGUN ${OK}</b>` : '<b class="ye">YETERSİZ</b>';
  // yanal itki profili → bileşke (t/m) ve T.T.K.'dan yükseklik (m)
  const profil = (fn, z0, z1, n = 80) => { let F = 0, Mz = 0, pmax = 0, zmax = z0; const dz = (z1 - z0) / n; for (let i = 0; i < n; i++) { const z = z0 + (i + 0.5) * dz, p = Math.abs(fn(z)) || 0; F += p * dz; Mz += p * dz * (z - z0); if (p > pmax) { pmax = p; zmax = z; } } return { F: tf(F), L: F > 1e-9 ? Mz / F : 0, pmax: tf(pmax), zmax }; };

  /* ---------- yük şeması (TBDY 16.12 + Westergaard) ---------- */
  const yukSemasi = (r) => {
    const g = r.S.geo, YK = r.YK, z0 = g.kAlt, z1 = Math.max(g.kUst, g.kZemin), Hs = z1 - z0;
    const durumlar = [['Hs', 'Hidrostatik Su Yükü', 'p<sub>w</sub> = γ<sub>w</sub>·H<sub>w</sub>', '#2a7fd4'], ['EHs', 'Hidrodinamik Su Yükü', 'p<sub>id</sub> = 7/8·k<sub>h</sub>·γ<sub>w</sub>·√(H<sub>w</sub>·z)', '#2a7fd4'],
      ['YAS', 'Hidrostatik Yeraltı Su Yükü', 'p<sub>yw</sub> = γ<sub>w</sub>·H<sub>yw</sub>', '#1b9e77'], ['E_YAS', 'Hidrodinamik Yeraltı Su Yükü', 'p<sub>ywd</sub> = 7/8·k<sub>h</sub>·γ<sub>w</sub>·√(H<sub>yw</sub>·z)', '#1b9e77'],
      ['Ht', 'Statik Toprak Yükü', 'p(z) = K·γ·z', '#a0522d'], ['Qs', 'Statik Sürşarj Yükü', 'p(q) = K·q', '#a0522d'], ['EHt', 'Dinamik Toprak Yükü', 'ΔP<sub>ad</sub> = ½·ΔK<sub>ad</sub>·γ*·H²', '#a0522d'], ['EQs', 'Dinamik Sürşarj Yükü', 'ΔP = ΔK<sub>ad</sub>·q·H', '#a0522d']];
    const ds = durumlar.map(([k, ad, f, col]) => ({ k, ad, f, col, ...profil(YK.fn[k] || (() => 0), z0, z1) })).filter(d => d.F > 1e-4);
    // şema: perde kesiti + kotlar (sol), basınç diyagramları (sağ, ızgara)
    const W = 760, H = 390, sy = (H - 50) / Hs, Y = z => H - 25 - (z - z0) * sy;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="sema">`;
    const xw = 120, tw = Math.max(18, g.tw * sy), xr0 = xw - 70, xr1 = xw + tw + 80;
    s += `<rect x="${xr0}" y="${Y(z0 + g.hr)}" width="${xr1 - xr0}" height="${g.hr * sy}" fill="#ddd" stroke="#000"/><rect x="${xw}" y="${Y(g.kUst)}" width="${tw}" height="${(g.kUst - z0 - g.hr) * sy}" fill="#ddd" stroke="#000"/>`;
    s += `<text x="${xw + tw / 2}" y="${(Y(g.kUst) + Y(z0 + g.hr)) / 2}" transform="rotate(-90 ${xw + tw / 2} ${(Y(g.kUst) + Y(z0 + g.hr)) / 2})" text-anchor="middle" font-size="11" font-weight="700">PERDE</text><text x="${(xr0 + xr1) / 2}" y="${Y(z0 + g.hr / 2) + 4}" text-anchor="middle" font-size="10" font-weight="700">TEMEL</text>`;
    if (g.kSu > z0 + g.hr) s += `<rect x="${xw + tw}" y="${Y(g.kSu)}" width="70" height="${(g.kSu - z0 - g.hr) * sy}" fill="#bfe3f2" opacity=".7"/><line x1="${xw + tw}" x2="${xw + tw + 80}" y1="${Y(g.kSu)}" y2="${Y(g.kSu)}" stroke="#000" stroke-dasharray="5 3"/>`;
    s += `<line x1="10" x2="${xw}" y1="${Y(g.kZemin)}" y2="${Y(g.kZemin)}" stroke="#8b5a2b" stroke-width="2"/>`;
    if (g.kYAS != null && g.kYAS > z0) s += `<line x1="10" x2="${xw}" y1="${Y(g.kYAS)}" y2="${Y(g.kYAS)}" stroke="#000" stroke-dasharray="6 3"/>`;
    const kot = (z, t, x, al) => `<text x="${x}" y="${Y(z) - 3}" font-size="10" text-anchor="${al || 'start'}"><tspan font-weight="700">${t}</tspan> ${(z >= 0 ? '+' : '') + z.toFixed(2)}</text>`;
    s += kot(g.kZemin, 'Z.K. =', 12) + (g.kYAS != null ? kot(g.kYAS, 'YASS =', 12) : '') + kot(g.kUst, 'Perde üst', xw - 4, 'end') + kot(g.kSu, 'Su', xw + tw + 4) + `<text x="${xr1 + 4}" y="${Y(z0) + 11}" font-size="10"><tspan font-weight="700">T.T.K. =</tspan> ${(z0 >= 0 ? '+' : '') + z0.toFixed(2)}</text>` + kot(z0 + g.hr, 'Temel üst', xr1 + 4);
    // diyagramlar
    const cw = 100, ch = 140, gx = 300; ds.slice(0, 8).forEach((d, i) => {
      const cx = gx + (i % 4) * (cw + 12), cy = 8 + Math.floor(i / 4) * (ch + 46), py = z => cy + ch - (z - z0) / Hs * ch, fn = YK.fn[d.k], pm = d.pmax || 1;
      let pts = `${cx},${py(z0)}`; for (let k = 0; k <= 40; k++) { const z = z0 + Hs * k / 40, p = tf(Math.abs(fn(z)) || 0); pts += ` ${cx + p / pm * (cw - 30)},${py(z)}`; } pts += ` ${cx},${py(z1)}`;
      s += `<polygon points="${pts}" fill="${d.col}" fill-opacity=".18" stroke="${d.col}"/><line x1="${cx}" x2="${cx}" y1="${py(z0)}" y2="${py(z1)}" stroke="#000"/>`;
      const ya = py(z0 + d.L); s += `<line x1="${cx + cw - 22}" x2="${cx + 3}" y1="${ya}" y2="${ya}" stroke="red" stroke-width="2.2" marker-end="url(#ok)"/><text x="${cx + 4}" y="${ya - 4}" font-size="9" fill="red" font-weight="700">F=${n2(d.F)} t</text>`;
      s += `<text x="${cx}" y="${cy + ch + 12}" font-size="8.5" font-weight="700">${d.ad}</text><text x="${cx}" y="${cy + ch + 23}" font-size="8">p<tspan font-size="6" dy="2">maks</tspan><tspan dy="-2"> = ${n2(d.pmax)} t/m²</tspan></text><text x="${cx}" y="${cy + ch + 33}" font-size="8">L = ${n2(d.L)} m (T.T.K.'dan)</text>`;
    });
    s += `<defs><marker id="ok" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="red"/></marker></defs></svg>`;
    const satir = ds.map(d => tr(td(d.k, 'class="l"'), td(d.ad, 'class="l"'), td(d.f, 'class="l"'), td(n2(d.pmax)), td(n2(d.F)), td(n2(d.L)))).join('');
    return s + tab([tr(th('Kod'), th('Yük', 'class="l"'), th('Bağıntı', 'class="l"'), th('p<sub>maks</sub><br>t/m²'), th('F<br>ton/m'), th('L<br>m')), satir]) +
      `<p class="k">H<sub>z</sub> = ${n2(g.kZemin - z0)} m (dolgu yüksekliği) · H<sub>w</sub> = ${n2(YK.hw)} m (iç su) · H<sub>yw</sub> = ${n2(YK.hgw)} m (yeraltı suyu) · H<sub>p</sub> = ${n2(g.kUst - z0 - g.hr)} m (perde) · bileşkeler 1 m perde genişliği içindir.</p>`;
  };

  /* ---------- betonarme hesabı (k2–k3 tablosu, firma biçimi) ---------- */
  const betonarme = (t, MAL, wmax, baslik) => {
    const bw = 100, h = t.h * 100, c = t.c * 100;
    const rows = t.katman.map(k => {
      const s = k.sec, d = (s.d || t.h - t.c) * 100, Md = tf(Math.abs(k.M)), Ms = tf(Math.abs(k.Ms)), Ah = (s.req || 0) * 1e4, Amin = (s.Amin || 0) * 1e4, Ase = s.ok ? s.As * 1e4 : 0;
      const k2 = Md > 1e-6 ? d / Math.sqrt(Md / (bw / 100)) : null, k3 = Md > 1e-6 ? Math.max(Ah, 0) * d / (Md * 100) : null, Ahes = Math.max(Ah, Amin);
      const ks = Ase ? bw * d / Ase : null, kz = s.ck && s.ck.z ? s.ck.z / (s.d || 1) : null, ss = s.ss != null ? s.ss * 10.197 : null, ssEm = MAL.fyk * 10 / 1.75;
      return { k, s, d, Md, Ms, Ah, Amin, Ahes, Ase, k2, k3, ks, kz, ss, ssEm, At: s.ck ? s.ck.At : null, w: s.w };
    });
    const ust = `<div class="bh"><div><b>Kesit Özellikleri</b><br>h = ${n2(h, 0)} cm · b<sub>w</sub> = ${bw} cm (kesit genişliği) · d′ = ${n2(c, 1)} cm (pas payı)<br>A<sub>s</sub> = k<sub>3</sub>·M<sub>d</sub> / d &nbsp;&nbsp; k<sub>2</sub> = d·(b<sub>w</sub>/M<sub>d</sub>)<sup>1/2</sup> &nbsp;&nbsp; A<sub>s(min)</sub> = ρ<sub>min</sub>·b<sub>w</sub>·d</div>
      <div><b>Malzeme Özellikleri</b><br><b>C ${MAL.fck}</b>: f<sub>ck</sub> = ${MAL.fck} MPa · f<sub>cd</sub> = ${n2(MAL.fcd, 1)} MPa · f<sub>ctd</sub> = ${n2(MAL.fctd)} MPa · E<sub>c</sub> = ${n2(MAL.Ec, 0)} MPa · γ<sub>mc</sub> = 1.5<br><b>B${MAL.fyk}C</b>: f<sub>yk</sub> = ${MAL.fyk} MPa · f<sub>yd</sub> = ${n2(MAL.fyd, 0)} MPa · E<sub>s</sub> = 2·10<sup>5</sup> MPa · γ<sub>ms</sub> = 1.15</div></div>`;
    const t1 = tab([tr(th('', 'colspan="2"'), th('Moment<br>(t.m)'), th('d<br>(cm)'), th('A<sub>s(min)</sub><br>(cm²/m)'), th('k<sub>2</sub>'), th('k<sub>3</sub>'), th('A<sub>s(hes)</sub><br>(cm²/m)'), th('Donatı'), th('A<sub>s(seç)</sub><br>(cm²/m)')),
      ...rows.map(x => tr(td(x.k.yon, 'class="l"'), td(x.k.yuz, 'class="l"'), td(n2(x.Md)), td(n2(x.d, 1)), td(n2(x.Amin)), td(x.k2 ? n2(x.k2) : '—'), td(x.k3 ? n2(x.k3, 3) : '—'), td(n2(x.Ahes)), td(x.s.ok ? `<b>Ø ${x.s.F} / ${Math.round(x.s.s * 100)}</b>` : '<b class="ye">YETERSİZ</b>'), td(x.s.ok ? n2(x.Ase) : '—'))) ]);
    const su = rows.filter(x => x.k.suYuz && x.s.ok);
    const t2 = su.length ? tab([tr(th('', 'colspan="2"'), th('M<sub>s</sub><br>(t.m)'), th('k<sub>s</sub>'), th('k<sub>z</sub>'), th('σ<sub>s</sub><br>(kg/cm²)'), th('A<sub>t</sub> = 2·a·s<br>(mm²)'), th('W<br>(mm)'), th('')),
      ...su.map(x => tr(td(x.k.yon, 'class="l"'), td(x.k.yuz, 'class="l"'), td(n2(x.Ms)), td(n2(x.ks)), td(n2(x.kz, 3)), td(`${n2(x.ss, 0)} ${x.ss < x.ssEm ? '&lt;' : '&gt;'} ${n2(x.ssEm, 0)} ${x.ss < x.ssEm ? 'Don. akmıyor ' + OK : 'Don. akıyor'}`), td(n2(x.At, 0)), td(n2(x.w, 3)), td(x.w <= wmax ? `&lt; ${wmax} ${OK}` : `&gt; ${wmax} ✗`)))]) : '<p class="k">Su ile temas etmeyen eleman: çatlak kontrolü yapılmamıştır.</p>';
    const t3 = su.length ? tab([tr(th('', 'colspan="2"'), th('A<sub>s(seç)</sub>'), th('A<sub>s(hes)</sub>'), th('A<sub>s(seç)</sub> / A<sub>s(hes)</sub>'), th('W (mm)')), ...su.map(x => tr(td(x.k.yon, 'class="l"'), td(x.k.yuz, 'class="l"'), td(n2(x.Ase)), td(n2(x.Ahes)), td(`${n2(x.Ase / Math.max(x.Ahes, 1e-9))} ${x.Ase / Math.max(x.Ahes, 1e-9) > 1.2 ? '&gt;' : '&lt;'} 1.2`), td(n2(x.w, 3))))]) : '';
    const ks = t.kesme ? `<p class="k">Kesme: V<sub>d</sub> = ${n2(tf(t.kesme.Vd))} t/m ${t.kesme.ok ? '≤' : '&gt;'} V<sub>cr</sub> = 0.65·f<sub>ctd</sub>·b<sub>w</sub>·d = ${n2(tf(t.kesme.Vcr))} t/m → ${t.kesme.ok ? 'Kesme donatısına gerek yoktur ' + OK : '<b class="ye">KESME YETERSİZ</b>'}</p>` : '';
    return `<h3 class="sayfa">${baslik} Betonarme Hesabı</h3>${ust}${t1}<p class="k">σ<sub>s</sub> = M<sub>s</sub> / (k<sub>z</sub>·d·A<sub>s</sub>) &nbsp; k<sub>s</sub> = b<sub>w</sub>·d / A<sub>s</sub></p>${t2}${t3 ? '<p class="k">Çatlak genişliği, seçilen donatı ve işletme (yük katsayısız) momenti ile çatlamış kesitten hesaplanmıştır.</p>' + t3 : ''}
      <div class="catlak"><b>ÇATLAK GENİŞLİĞİ HESABI:</b> &nbsp; w = 1.3·(A<sub>t</sub>·c)<sup>1/3</sup>·σ<sub>s</sub>·10<sup>-5</sup> &nbsp; &lt; ${wmax} mm</div>${ks}`;
  };

  P._dsiRap = { betonarme, tab, tr, td, th, n2, esc, durum, tf, OK }; // statik-kabuk-rapor.js (yay / oval hazne) kullanır
  /* ---------- RAPOR ---------- */
  const raporDsi = () => {
    const r = R, S0 = r.S, g = S0.geo, M = r.MAL, IT = r.IT, YK = r.YK, pr = S0.proj, z = S0.zemin, d = S0.dep, rp = RAP(), mal = S0.mal;
    const SS = +rp.SS || null, S1 = +rp.S1 || null, FS = +rp.FS || null, F1 = +rp.F1 || null, SD1 = +rp.SD1 || (S1 && F1 ? S1 * F1 : null), qt = +rp.qt || tf(z.sig), ko = tf(z.kw);
    const ad = pr.ad || 'YAPI', kod = rp.kod || '', bas = `${esc(pr.tesis || '')}`.toLocaleUpperCase('tr');
    const yer = [rp.il, rp.ilce].filter(Boolean).map(s => s.toLocaleUpperCase('tr'));
    const icindekiler = [['1. GENEL', 0], ['1.1. Açıklama', 1], ['1.2. Tasarımda Kullanılan Programlar', 1], ['2. TASARIM KRİTERLERİ', 0], ['2.1. Zemin Taşıma Gücü Parametreleri', 1], ['3. KULLANILAN MALZEMELER', 0], ['3.1. Beton Sınıfları', 1], ['3.2. Çelik Sınıfları', 1], ['4. ÇATLAK KONTROLÜ', 0], ['5. YÜK KOMBİNASYONLARI', 0], ['5.1. Üst Yapılarda', 1], ['5.2. Su Tutucu Yapılar', 1], ['6. DÜŞEY YÜKLER', 0], ['6.1. Hareketli Yükler', 1], ['6.2. Sabit Yükler', 1], ['7. YANAL YÜKLER', 0], ['7.1. Zemin Parametreleri', 1], ['7.2. Hidrolik Parametreler', 1], ['8. STATİK HESAPLAR', 0], [`8.1. ${kod ? kod + ' ' : ''}${ad}`, 1], ['9. YARARLANILAN KAYNAKLAR', 0]];
    let h = `<div class="kapak">${esc(rp.kapak).split('\n').map(s => `<div>${s}</div>`).join('')}<div class="kp">${bas}</div><div class="kb">STATİK RAPOR</div>${pr.tarih ? `<div class="kt">${esc(pr.tarih)}</div>` : ''}</div>`;
    h += `<div class="sayfa"><h1 class="ic">İÇİNDEKİLER</h1>${icindekiler.map(([s, l]) => `<div class="tc l${l}"><span>${esc(s)}</span><i></i></div>`).join('')}</div>`;
    // 1 GENEL
    h += `<div class="sayfa ust">${bas}<br>STATİK RAPOR</div><h2>1. GENEL</h2><h3>1.1. AÇIKLAMA</h3><p>Bu rapor ${yer.length ? yer.join(' İli ') + ' ilçesinde ' : ''}yapılacak olan ${bas} işi kapsamında <b>${esc(kod ? kod + ' ' : '')}${esc(ad)}</b> yapısına ait statik-betonarme hesapları içermektedir. Yapı ${n2(g.Lx)} × ${n2(g.Ly)} m dış ölçülü, ${r.GM.comps.length} bölmeli, radye temelli su tutucu betonarme yapıdır.</p>
      <h3>1.2. TASARIMDA KULLANILAN PROGRAMLAR</h3><p>Yapının statik hesaplarında TS 498, TS 500, TBDY 2018 ve DSİ Su Tutucu Betonarme Yapıların Yapımına Ait Genel Teknik Şartname standartlarına uygun ArıtmaCAD Statik modülü (plak sonlu elemanlar: perdeler, Winkler zemini üzerinde radye, üst döşemeler) kullanılmıştır. Su tutucu yapılarda hesaplar Taşıma Gücü yöntemine göre yapılmış, çatlak kontrolü işletme yükleri altında yapılmıştır.</p>`;
    // 2 TASARIM KRİTERLERİ
    const kr = (ad2, sb, v, ac) => tr(td(ad2, 'class="l"'), td(sb), td(': ' + v, 'class="l b"'), td(ac || '', 'class="l k"'));
    h += `<h2>2. TASARIM KRİTERLERİ</h2>` + tab([
      kr('Analiz Tipi', '', esc(rp.analiz)), kr('Deprem Yer Hareketi Düzeyi', '', esc(rp.dd), rp.dd === 'DD-2' ? '50 yılda aşılma olasılığı %10 (tekrarlanma periyodu 475 yıl)' : ''), kr('Bina Kullanım Sınıfı', '', esc(rp.bks), rp.bks === 'BKS-3' ? '(Diğer binalar)' : ''), kr('Bina Önem Katsayısı', 'I', n2(d.I || 1)),
      kr('Yerel Zemin Sınıfı', '', esc(rp.zs)), kr('Kısa Periyot Harita Spektral İvme Katsayısı', 'S<sub>S</sub>', SS ? n2(SS, 3) : '—', 'Türkiye Deprem Tehlike Haritaları'), kr('1.0 Saniye Periyot Harita Spektral İvme Katsayısı', 'S<sub>1</sub>', S1 ? n2(S1, 3) : '—'),
      kr('En Büyük Yer İvmesi [g]', 'PGA', rp.PGA ? n2(+rp.PGA, 3) : '—'), kr('En Büyük Yer Hızı [cm/sn]', 'PGV', rp.PGV ? n2(+rp.PGV, 3) : '—'), kr('Kısa Periyot Bölgesi İçin Yerel Zemin Etki Katsayısı', 'F<sub>S</sub>', FS ? n2(FS, 1) : '—'), kr('1.0 Saniye Periyot İçin Yerel Zemin Etki Katsayısı', 'F<sub>1</sub>', F1 ? n2(F1, 1) : '—'),
      kr('Kısa Periyot Tasarım Spektral İvme Katsayısı', 'S<sub>DS</sub>', n2(d.SDS, 3)), kr('1.0 Saniye Periyot İçin Tasarım Spektral İvme Katsayısı', 'S<sub>D1</sub>', SD1 ? n2(SD1, 3) : '—'),
      kr('Statik-Eşdeğer Deprem Azaltma Katsayısı', 'r', n2(d.r, 1), +d.r <= 1 ? 'Yer değiştirmesi engellenmiş rijit perde' : 'Yer değiştirmesine izin verilen dayanma yapısı'), kr('Hareketli Yük Katsayısı', 'n', n2(+rp.nQ, 1), 'Depo, antrepo, vb.'),
      kr('Zemin Kayma Direnci Açısı', 'ϕ', z.phi + '°'), kr('Zeminin Kohezyonu', 'C', '0', 'ton/m²'), kr('Zemin Yüzeyinin Yatayla Yaptığı Açı', 'β', '0'), kr('Duvarın Toprak Tarafında Yatayla Yaptığı Açı', 'Ψ', '90'), kr('Zemin İle Duvar Arasındaki Sürtünme Açısı', 'δ', n2(IT.delta, 1) + '°'),
      kr('Suyun Birim Hacim Ağırlığı', 'γ<sub>su</sub>', '1.00', 'ton/m³'), kr('Zeminin Kuru Birim Hacim Ağırlığı', 'γ', n2(tf(z.g)), 'ton/m³'), kr('Zeminin Suya Doygun Birim Hacim Ağırlığı', 'γ<sub>d</sub>', n2(tf(z.gs)), 'ton/m³'), kr('Zeminin Su Altındaki Birim Hacim Ağırlığı', 'γ′', n2(tf(z.gs) - 1), 'ton/m³'),
      kr('Yeraltı Su Seviyesi', '', g.kYAS != null ? `${n2(g.kYAS)} (Z.K.'dan ${n2(g.kZemin - g.kYAS, 1)} m derinde)` : 'Yok'), kr('Beton Birim Hacim Ağırlığı', '', n2(tf(mal.gc), 2), 'ton/m³'), kr('Kar Bölgesi', '', esc(rp.kar), '…TS 498')], 'kriter') +
      `<h3>2.1. ZEMİN TAŞIMA GÜCÜ PARAMETRELERİ</h3>` + tab([tr(th('KOD'), th('ÜNİTE'), th('Temel Taşıma Gücü Tasarım Dayanımı<br>q<sub>t</sub> (ton/m²)'), th('Zemin Yatak Katsayısı<br>k<sub>o</sub> (ton/m³)'), th('Yeraltı Su Seviyesi<br>m')), tr(td(esc(kod)), td(esc(ad), 'class="l"'), td(n2(qt)), td(n2(ko)), td(g.kYAS != null ? n2(g.kZemin - g.kYAS) : '—'))]);
    // 3 MALZEMELER
    const bRow = e => tr(td(e, 'class="l"'), td('C ' + M.fck), td(M.fck), td(n2(M.fcd)), td(n2(M.fctd)), td(n2(M.Ec, 0)));
    const sRow = e => tr(td(e, 'class="l"'), td('B' + M.fyk + 'C'), td(M.fyk), td(n2(M.fyd, 3)), td('2·10<sup>5</sup>'));
    const el = ['Perdeler', 'Radye Temel', ...(r.dosemeler.length ? ['Plak Döşemeler'] : [])];
    h += `<h2>3. KULLANILAN MALZEMELER</h2><h3>3.1. BETON SINIFLARI: &nbsp; γ<sub>mc</sub> = 1.5</h3>` + tab([tr(th(''), th('Beton'), th('f<sub>ck</sub>'), th('f<sub>cd</sub>'), th('f<sub>ctd</sub>'), th('E.M.')), tr(th(''), th('', 'colspan="5"').replace('></th>', '>(MPa)</th>')), ...el.map(bRow)]) +
      `<h3>3.2. ÇELİK SINIFLARI: &nbsp; γ<sub>ms</sub> = 1.15</h3>` + tab([tr(th(''), th('Çelik'), th('f<sub>yk</sub>'), th('f<sub>yd</sub>'), th('E.M.')), tr(th(''), th('', 'colspan="4"').replace('></th>', '>(MPa)</th>')), ...el.map(sRow)]);
    // 4 ÇATLAK
    h += `<h2>4. ÇATLAK KONTROLÜ</h2><p>Su tutucu yapıların çatlak kontrolleri kombinasyondaki kesit tesirleri dikkate alınarak, TS 500'deki esaslar ve DSİ'ye ait Su Tutucu Betonarme Yapıların Yapımına Ait Genel Teknik Şartnamesindeki A ve B sınıf tesir için W<sub>max</sub> = 0.2 mm, C sınıf tesir için W<sub>max</sub> = 0.25 mm çatlak genişliği değerlerine göre yapılmıştır. Bu yapıda W<sub>max</sub> = <b>${S0.tas.wmax} mm</b> alınmıştır. Çatlak genişliği hesabında aşağıdaki formül kullanılmıştır.</p>
      <p class="f">w = 1.3 · ∛(A<sub>t</sub> · c) · σ<sub>s</sub> · 10<sup>-5</sup> &nbsp;……….TS 500 sayfa 64</p>
      <table class="sem">${[['w', 'Çatlak genişliği (mm)'], ['A<sub>t</sub>', 'Her bir çekme çubuğuna düşen etkili beton alanı A<sub>t</sub> = 2·a·s (mm²)'], ['a', 'Çekme donatısı ağırlık merkezinden ölçülen beton örtüsü (mm)'], ['s', 'Donatı aralığı (mm)'], ['c', 'En dış donatı merkezinden ölçülen beton örtüsü (mm)'], ['σ<sub>s</sub>', 'Çatlamış kesit varsayımı ile hesaplanmış olan, yük katsayısı ile çarpılmamış donatı gerilmesi (MPa). Gerilme hesaplarında eksenel basınç ihmal edilmiştir.']].map(([a, b]) => tr(td(a), td(':'), td(b, 'class="l"'))).join('')}</table>
      <p><b>Paspayı;</b> ……….TS 500 (ÇİZELGE 9.3)</p><table class="sem">${[[`${n2(mal.cR * 1000, 0)} mm`, 'Radye temel (zeminle doğrudan ilişkide olan elemanlar)'], [`${n2(mal.cP * 1000, 0)} mm`, 'Perdeler (toprak ve su ile temas eden yüzeyler)'], [`${n2(mal.cD * 1000, 0)} mm`, 'Döşemeler']].map(([a, b]) => tr(td('c<sub>c</sub> ≥'), td(a), td(':'), td(b, 'class="l"'))).join('')}</table>`;
    // 5 KOMBİNASYONLAR
    const sem = [['G', 'Ölü Yükler'], ['Q', 'Hareketli Yükler'], ['Hs', 'Akışkan (Su) Basıncı'], ['Ht', 'Yanal Toprak İtkisi'], ['Qs', 'Sürşarj Yanal İtkisi'], ['YAS', 'Hidrostatik Yeraltı Suyu Yükü'], ['EHt', 'Yanal Toprak İtkisinin Deprem Yükü'], ['EHs', 'Akışkan Basıncının Deprem Yükü'], ['EQs', 'Sürşarjın Deprem Yükü'], ['E_YAS', 'Hidrostatik Yeraltı Suyu Yükünün Deprem Yükü']];
    h += `<h2 class="sayfa">5. YÜK KOMBİNASYONLARI</h2><table class="sem">${sem.map(([a, b]) => tr(td(a, 'class="l b"'), td(':'), td(b, 'class="l"'))).join('')}</table>
      <h3>5.1. ÜST YAPILARDA</h3><p>Yük etkisinin karakteristik değeri F<sub>k</sub>, TS 498 ve TS ISO 9194 ile TBDY 2018'de öngörülen yük etkileridir. Tasarımda yapıya etkimesi olasılığı bulunan tüm yük birleşimleri dikkate alınmıştır.</p>
      <p class="f">Yalnız düşey yükler için: F<sub>d</sub> = 1.4G + 1.6Q ……(5.1) &nbsp;&nbsp; F<sub>d</sub> = 1.0G + 1.2Q + 1.2T ……(5.2)<br>Depremin söz konusu olduğu durumlarda: F<sub>d</sub> = 1.0G + 1.0Q + 1.0E ……(5.5) &nbsp;&nbsp; F<sub>d</sub> = 0.9G + 1.0E ……(5.6)<br>Yanal toprak itkisi bulunan durumlarda: F<sub>d</sub> = 1.4G + 1.6Q + 1.6H ……(5.7) &nbsp;&nbsp; F<sub>d</sub> = 0.9G + 1.6H ……(5.8)</p><p>Akışkan basıncı bulunan durumlarda bu basınç 1.4 yük katsayısıyla çarpılarak içinde hareketli yük bulunan tüm yük birleşimlerine eklenir. Kullanılabilirlik sınır durumu hesaplarında bütün yük katsayıları 1.0 alınır.</p>
      <h3>5.2. SU TUTUCU YAPILAR</h3><p>Su tutucu yapıların tasarımı aşağıdaki yükleme durumlarına göre yapılmıştır.</p>
      <p><b>Test durumu yüklemesi:</b> Yapının sızdırmazlık testine tabi tutulduğu anı ifade eder. Yapının çevre dolgusu yapılmadan, yapı işletme seviyesine kadar su ile doldurulur.<br><b>İşletme durumu yüklemesi:</b> Yapının içeride maksimum işletme seviyesine kadar su yüküne, dışarıda ise dolgu yüküne ve varsa yeraltı suyu gibi diğer yüklere maruz kaldığı durumdur.<br><b>Bakım durumu yüklemesi:</b> Yapının bakıma alındığı, dışarıdan yalnız dolgu yüklerine maruz kaldığı, su yükü taşımadığı durumdur.<br><b>Deprem yüklemesi:</b> İşletme ve bakım anında deprem olması durumunu temsil eder.</p>`;
    const cs = P.CASES.filter(c => S0.komb.some(k => k.tsm[c] || k.emn[c]));
    h += `<p>Tanımlanan kombinasyonların ZARF'ı alınarak en elverişsiz tesir değerleri bulunmuş; kesit tasarımında taşıma gücü (tsm) katsayıları, çatlak ve zemin gerilmesi kontrolünde işletme (emn) katsayıları kullanılmıştır.</p>` +
      tab([tr(th('Komb.'), th('Durum', 'class="l"'), th(''), ...cs.map(c => th(c))), ...S0.komb.flatMap(k => [tr(td(`<b>${esc(k.ad)}</b>`, 'rowspan="2"'), td(esc(k.acik), 'class="l" rowspan="2"'), td('tsm'), ...cs.map(c => td(k.tsm[c] ? n2(k.tsm[c], 1) : ''))), tr(td('emn'), ...cs.map(c => td(k.emn[c] ? n2(k.emn[c], 1) : '')))]), tr(td('<b>ENV</b>'), td(`${S0.komb.map(k => k.ad).join(' … ')} zarfı`, `class="l" colspan="${cs.length + 2}"`))], 'komb');
    // 6 DÜŞEY YÜKLER
    h += `<h2 class="sayfa">6. DÜŞEY YÜKLER</h2><h3>6.1. HAREKETLİ YÜKLER (TS 498)</h3>` + tab([tr(th('Kullanma şekli', 'class="l"'), th('Hesap değeri<br>kg/m² (kN/m²)')), ...[['Çatı arası odalar', '150 (1.5)'], ['Konut, teras, oda ve koridorlar, bürolar', '200 (2.0)'], ['Konut merdivenleri; okul, hastane muayene odaları', '350 (3.5)'], ['Umuma açık yapılarda büro, okul, depo, hafif atölyeler, balkonlar, genel yapı koridorları', '500 (5.0)'], ['Tribünler (oturma yeri sabit olmayan)', '750 (7.5)'], ['Garajlar (toplam ağırlığı 2.5 tona kadar araçlar)', '500 (5.0)']].map(([a, b]) => tr(td(a, 'class="l"'), td(b)))]);
    const ds = (g.doseme || []);
    h += `<h3>6.2. SABİT YÜKLER</h3><div class="iki"><div><b>6.2.1 Temel Döşemesi;</b>${tab([tr(td('B.A. Radye', 'class="l"'), td(`${n2(g.hr * 100, 1)} cm`), td(`* ${n2(tf(mal.gc), 2)} ton/m³`), td(`= ${n2(g.hr * tf(mal.gc), 3)} ton/m²`))], 'sem')}</div>` +
      (ds.length ? ds.map(o => `<div><b>6.2.2 ${esc(o.ad || 'Döşeme')};</b>${tab([tr(td('B.A. Döşeme', 'class="l"'), td(`${n2(o.t * 100, 1)} cm`), td(`* ${n2(tf(mal.gc), 2)} ton/m³`), td(`= ${n2(o.t * tf(mal.gc), 3)} ton/m²`)), tr(td('Kaplama / ek ölü yük', 'class="l"'), td(''), td(''), td(`= ${n2(tf(o.g), 3)} ton/m²`)), tr(td('', 'colspan="3"'), td(`<b>g = ${n2(tf(o.g + o.t * mal.gc), 2)} ton/m² &nbsp; q = ${n2(tf(o.q), 2)} ton/m²</b>`))], 'sem')}</div>`).join('') : '') + `</div><p class="k">Not: Betonarme eleman öz ağırlıkları statik analiz programı tarafından hesaplanmıştır.</p>`;
    // 7 YANAL YÜKLER
    h += `<h2 class="sayfa">7. YANAL YÜKLER</h2><h3>7.1. ZEMİN PARAMETRELERİ</h3><p>TBDY 2018 16.12.2.1 – Toprak basınçlarının hesabında kullanılacak yatay ve düşey statik-eşdeğer deprem katsayıları Denk.(16.22)'de tanımlanmıştır.</p>
      <p class="f">k<sub>h</sub> = 0.4·S<sub>DS</sub> / r = <b>${n2(IT.kh, 3)}</b> &nbsp;&nbsp;&nbsp; k<sub>v</sub> = 0.5·k<sub>h</sub> = <b>${n2(IT.kv, 3)}</b></p>
      <p>16.12.3.2 – Dayanma yapısının arkasında su olup olmamasına bağlı olarak θ açısı:</p><p class="f">Kuru zemin: θ<sub>1</sub> = ${n2(IT.th1, 3)}° &nbsp; θ<sub>2</sub> = ${n2(IT.th2, 3)}° &nbsp;&nbsp; Su altındaki zemin: θ<sub>1</sub> = ${n2(IT.thw1, 3)}° &nbsp; θ<sub>2</sub> = ${n2(IT.thw2, 3)}°</p>
      <p>16.12.2.4 – Toplam aktif basınç katsayısı Denk.(16.24) ile hesaplanmıştır (β ≤ ϕ′<sub>d</sub> − θ):</p>` + tab([tr(th('', 'class="l"'), th('Kuru zemin'), th('Su altındaki zemin')), tr(td('K<sub>a1</sub> (1 − k<sub>v</sub>)', 'class="l"'), td(n2(IT.KAE1, 3)), td(n2(IT.KAEw1, 3))), tr(td('K<sub>a2</sub> (1 + k<sub>v</sub>)', 'class="l"'), td(n2(IT.KAE2, 3)), td(n2(IT.KAEw2, 3))), tr(td('<b>Toplam K<sub>at</sub></b>', 'class="l"'), td(`<b>${n2(IT.KatK, 3)}</b>`), td(`<b>${n2(IT.KatW, 3)}</b>`)), tr(td('Statik K (hesapta)', 'class="l"'), td(n2(IT.Ks, 3), 'colspan="2"')), tr(td('<b>Dinamik K<sub>ad</sub> = K<sub>at</sub> − K<sub>a</sub></b>', 'class="l"'), td(`<b>${n2(IT.dK, 3)}</b>`), td(`<b>${n2(IT.dKw, 3)}</b>`))]) +
      `<p>16.12.2.7 – Statik durumda θ = 0 alınır. Dinamik toprak basınç katsayısı, toplam basınç katsayısından statik basınç katsayısının çıkarılması ile elde edilir.</p>
      <p class="f">Statik Zemin İtkisi: &nbsp; P(z) = γ*·K·h ……….Statik Toprak Basıncı &nbsp;&nbsp; P(q) = K·q ……….Statik Sürşarj Basıncı &nbsp;&nbsp; (K = ${S0.zemin.K === 'K0' ? 'K<sub>0</sub>' : 'K<sub>a</sub>'} = ${n2(IT.Ks, 3)})</p>
      <p class="f">Dinamik Zemin İtkisi: &nbsp; P<sub>ad</sub> = K<sub>ad</sub>·(1 ± k<sub>v</sub>)·[½·γ·H² + q·H] ……….Dinamik Toprak + Sürşarj Basıncı</p>
      <h3>7.2. HİDROLİK PARAMETRELER</h3><p class="f">ΔP<sub>(su)</sub> = γ<sub>(su)</sub>·d<sub>(su)</sub> ……….Hidrostatik Su Basıncı<br>ΔP<sub>(su)</sub>(z) = 7/8·(0.4·S<sub>DS</sub>)·γ<sub>(su)</sub>·√(z·d<sub>(su)</sub>) ……….Hidrodinamik Su Basıncı (Westergaard)<br>ΔP<sub>(su)</sub> = 7/12·(0.4·S<sub>DS</sub>)·γ<sub>(su)</sub>·d<sup>2</sup><sub>(su)</sub> &nbsp;&nbsp; z = 0.6·d<sub>(su)</sub> (bileşke, su yüzeyinden derinlik — Denk. 16.20)</p>
      <p class="k">S<sub>DS</sub>: zemin yüzeyinde tanımlanan kısa periyot tasarım spektral ivme katsayısı; d<sub>(su)</sub>: su altındaki duvar yüksekliği.</p>`;
    // 8 STATİK HESAPLAR
    h += `<div class="sayfa ayrac"><div>${esc(kod)}</div><div>${esc(ad).toLocaleUpperCase('tr')}</div></div>`;
    h += `<h2>8. STATİK HESAPLAR</h2><h3>8.1. ${esc(kod ? kod + ' ' : '')}${esc(ad).toLocaleUpperCase('tr')}</h3><div class="baslikKutu">DEPREM ETKİSİ ALTINDA DAYANMA YAPILARININ TASARIMI İÇİN YÜKLER<br><small>TBDY - 2018 (Bölüm 16.12.) ve WESTERGAARD METODU</small></div>` + yukSemasi(r);
    if (r.kabuk && P.kabukRapor8) h += P.kabukRapor8(r); else {
    h += `<h3>Analiz Modeli</h3><p>Perdeler, radye ve üst döşemeler dikdörtgen plak sonlu elemanlarıyla modellenmiştir (ağ boyu ≤ ${S0.tas.mesh} m). Her perde, kesişen perdeler arasındaki panel olarak çözülmüş; taban radyeye ankastre, düşey kenarlar ${S0.tas.kenarZarf ? 'ankastre ve mafsallı iki ayrı kabulle çözülüp zarf alınmış' : 'ankastre kabul edilmiş'}tir. Radye ${n2(r.GM.R.x1 - r.GM.R.x0)} × ${n2(r.GM.R.y1 - r.GM.R.y0)} m, Winkler zemini (k<sub>o</sub> = ${n2(ko, 0)} ton/m³) üzerindedir; perde ağırlıkları ve taban momentleri radyeye aktarılmıştır.${(g.doseme || []).length ? ` Üst döşemeler, altlarındaki ara perdelerden panellere bölünmüş; perde üzerine oturan kenarlar ${S0.tas.dosemeMesnet === 'Z' ? 'mafsallı ve ankastre iki ayrı kabulle çözülüp zarf alınmış' : '<b>perdelere ankastre</b>'}, perde üzerine oturmayan kenarlar serbest kabul edilmiştir (yük birleşimleri 1.4G + 1.6Q ve G + Q). Ankastre birleşim için döşeme üst donatısı boydan boya tek parça olarak perde üzerinden geçirilip uçlarından perdeye gönyelenmiş, perde düşey donatısı döşemeye kıvrılmıştır.` : ''}</p>`;
    // elemanlar
    const isiImg = (xs, ys, val, bs) => `<img src="${isi(xs, ys, val.map(tf), bs, 't.m/m')}">`;
    const perdeImg = tip => { let best = null, bv = -1; r.GM.walls.forEach((w, i) => { if (w.tip !== tip) return; for (const p of r.perdeler[i].panels) for (const v of p.var) { const m = Math.max(...v.Z.tsm.yp, ...v.Z.tsm.yn.map(Math.abs)); if (m > bv) { bv = m; best = { w, p, v }; } } }); if (!best) return ''; const yy = best.v.Z.tsm; return isiImg(best.p.xs, best.p.ys, Array.from(yy.yp, (a, i) => (a >= -yy.yn[i] ? a : yy.yn[i])), `${best.w.ad} Perdesi M (Max - Min) Diyagramı`); };
    const rd = r.radye, rimg = (k1, k2, bs) => { const Z = rd.Z.tsm; return isiImg(rd.xs, rd.ys, Array.from(Z[k1], (a, i) => (a >= -Z[k2][i] ? a : Z[k2][i])), bs); };
    const perdeAd = tip => r.GM.walls.filter(w => w.tip === tip).map(w => w.ad).join(', ');
    for (const t of r.tasarim) {
      if (/perde/i.test(t.eleman)) { const tip = /^Dış/.test(t.eleman) ? 'dis' : 'ic'; h += `<h3 class="sayfa">${esc(perdeAd(tip))} Perdeleri M (Max - Min) Diyagramı</h3>${perdeImg(tip)}` + betonarme(t, M, S0.tas.wmax, `${esc(t.eleman)} (${esc(perdeAd(tip))})`); }
      else if (/^Radye/.test(t.eleman)) h += `<h3 class="sayfa">${n2(g.kAlt)} Kotu Temel M11 - M22 (Max - Min) Diyagramı</h3>${rimg('xp', 'xn', 'Temel M11 (X yönü) — Max/Min')}${rimg('yp', 'yn', 'Temel M22 (Y yönü) — Max/Min')}` + betonarme(t, M, S0.tas.wmax, `${n2(g.kAlt)} Kotu Temel`);
      else { h += betonarme(t, M, S0.tas.wmax, `${n2(g.kUst)} Kotu ${esc(t.eleman)}`);
        if (S0.tas.dosemeMesnet !== 'Z') { const Mm = Math.max(...t.katman.filter(k => /mesnet/i.test(k.yuz)).map(k => tf(Math.abs(k.M))), 0), rows = [];
          for (const [ad2, el2, yz] of [['Dış perde', 'Dış perde', 'İç yüz'], ['Ara perde', 'Ara perde', 'Yüz 1']]) { const tt = r.tasarim.find(x => x.eleman.startsWith(el2)); if (!tt) continue; const kk = tt.katman.find(q => q.yon === 'Düşey' && q.yuz === yz); if (!kk || !kk.sec.ok) continue; const dd = kk.sec.d || (tt.h - tt.c), Mr = tf(0.9 * kk.sec.As * M.fyd * 1000 * dd); rows.push(tr(td(ad2 + ' (t=' + n2(tt.h * 100, 0) + ' cm) üst ucu', 'class="l"'), td(`Ø${kk.sec.F}/${Math.round(kk.sec.s * 100)}`), td(n2(kk.sec.As * 1e4)), td(n2(Mr)), td(n2(Mm)), td(Mm <= Mr ? OK : '<b class="ye">✗</b>'))); }
          if (rows.length) h += `<h4>Döşeme – Perde Ankastre Birleşim Kontrolü</h4><p>Döşeme mesnet momenti perde üst ucuna aktarılır. Perde düşey donatısı döşemeye kıvrılarak ankraj sağlanmış olup perde üst kesitinin moment kapasitesi M<sub>r</sub> = 0.9·A<sub>s</sub>·f<sub>yd</sub>·d ile kontrol edilmiştir.</p>` + tab([tr(th('Mesnet', 'class="l"'), th('Perde düşey (döşeme tarafı)'), th('A<sub>s</sub><br>cm²/m'), th('M<sub>r</sub><br>t.m/m'), th('M<sub>mesnet</sub><br>t.m/m'), th('')), ...rows]); } }
    }
    // zemin gerilmesi
    const Z = r.zem, kq = rd.kombQ || [], depK = k => /DEPREM|EQ|E_/i.test((S0.komb.find(x => x.ad === k.ad) || {}).acik || '') || Object.keys((S0.komb.find(x => x.ad === k.ad) || { emn: {} }).emn).some(c => /^E/.test(c));
    const qD = Math.max(0, ...kq.filter(k => !depK(k)).map(k => k.qmax)), qE = Math.max(0, ...kq.filter(depK).map(k => k.qmax)), sg = tf(z.sig);
    const zr = (ad2, q) => { const del = tf(q) / ko; return tr(td(ad2, 'class="l b"'), td(n2(tf(Z.Ntop), 0)), td(n2(del, 4)), td(n2(Z.A))); };
    h += `<h3 class="sayfa">Zemin Gerilme Kontrolü</h3><p>Sonlu elemanlar analizinden elde edilen her bir yük kombinasyonuna ait en büyük zemin yayı deplasmanı ile zemin yatak katsayısı çarpılarak temel altında oluşan zemin gerilmesi bulunmuştur.</p>` +
      tab([tr(th(''), th('Global FZ'), th('Deplasman'), th('Temel Alanı'), th('Zemin Yatak Katsayısı'), th('Zemin Emniyet Gerilmesi')), tr(th(''), th('ton'), th('m'), th('m²'), th('t/m³'), th('t/m²')), zr('TML', qD).replace('</tr>', `${td(n2(ko, 0), 'rowspan="2"')}${td(n2(sg), 'rowspan="2"')}</tr>`), ...(qE ? [zr('TML_EQ', qE)] : [])]) +
      `<p class="f">Gerilme σ = ${n2(tf(qD) / ko, 4)} × ${n2(ko, 0)} = <b>${n2(tf(qD))}</b> ${tf(qD) <= sg ? '&lt;' : '&gt;'} ${n2(sg)} t/m² &nbsp; Zemin Emniyet Gerilmesi ${durum(tf(qD) <= sg)}</p>` + (qE ? `<p class="f">Gerilme σ<sub>EQ</sub> = ${n2(tf(qE) / ko, 4)} × ${n2(ko, 0)} = <b>${n2(tf(qE))}</b> ${tf(qE) <= sg ? '&lt;' : '&gt;'} ${n2(sg)} t/m² &nbsp; Zemin Emniyet Gerilmesi ${durum(tf(qE) <= sg)}</p>` : '') +
      tab([tr(th('Komb. (emn)'), ...kq.map(k => th(esc(k.ad)))), tr(td('σ<sub>maks</sub> t/m²'), ...kq.map(k => td(n2(tf(k.qmax))))), tr(td('σ<sub>min</sub> t/m²'), ...kq.map(k => td(n2(tf(k.qmin)))))]);
    // yüzme tahkiki
    const K = r.kald, gc = tf(mal.gc), hp = g.kUst - g.kAlt - g.hr, Rw = r.GM.R, satirlar = [];
    satirlar.push(['Temel (radye)', 1, Rw.x1 - Rw.x0, Rw.y1 - Rw.y0, g.hr]);
    r.GM.walls.forEach(w => satirlar.push([`${w.ad} Perde`, 1, w.t, w.L, hp]));
    ds.forEach(o => satirlar.push([`${o.ad || 'Döşeme'}`, 1, o.x1 - o.x0, o.y1 - o.y0, o.t]));
    let topW = 0; const wRows = satirlar.map(([a, n, e, b, y]) => { const w = n * e * b * y * gc; topW += w; return tr(td(esc(a), 'class="l"'), td(n), td(n2(e)), td(n2(b)), td(n2(y)), td(n2(gc, 2)), td(n2(w))); });
    const ekZ = tf(Z.Wt || 0); if (ekZ > 0) { topW += ekZ; wRows.push(tr(td('Pabuç üstündeki zemin', 'class="l"'), td('', 'colspan="5"'), td(n2(ekZ)))); }
    if (g.kYAS != null && g.kYAS > g.kAlt) {
      const Hy = g.kYAS - g.kAlt, U = Hy * 1.0 * Z.A, Ugs = U * (K.gerekli || 1.1);
      h += `<h3 class="sayfa">Yüzme Tahkiki</h3><table class="sem">${tr(td('Zemin Kotu :'), td(n2(g.kZemin)))}${tr(td('Yeraltı Su Seviyesi :'), td(n2(g.kYAS)))}${tr(td('Temel Alt Kotu :'), td(n2(g.kAlt)))}</table><h4>1.1. Hidrostatik Yeraltı Su Kaldırma Kuvveti</h4>` +
        tab([tr(td('Temel Derinliği', 'class="l"'), td('D<sub>f</sub>'), td(`= ${n2(g.kZemin - g.kAlt)} m`, 'class="l"')), tr(td('Yer Altı Su Seviyesi', 'class="l"'), td('D<sub>w</sub>'), td(`= ${n2(g.kZemin - g.kYAS)} m`, 'class="l"')), tr(td('YASS Altında Kalan Derinlik', 'class="l"'), td('H<sub>yass</sub>'), td(`= ${n2(Hy)} m`, 'class="l"')), tr(td('Temel Alanı', 'class="l"'), td('A'), td(`= ${n2(Z.A)} m²`, 'class="l"')), tr(td('Yüzdürme Kuvveti', 'class="l"'), td('σ<sub>w</sub>'), td(`= ${n2(Hy)} ton/m²`, 'class="l"')), tr(td(`Yüzdürme Kuvvet Olmaması İçin Uygulanması Gereken Minimum Yük (GS = ${K.gerekli})`, 'class="l"'), td('q<sub>min</sub>'), td(`= ${n2(Ugs)} ton`, 'class="l"'))], 'yuz') +
        `<h4>1.2. Yapı Ağırlığı</h4>` + tab([tr(th(''), th('Adet'), th('En'), th('Boy'), th('Yükseklik'), th('B.H.Ağ.'), th('Ağırlık')), tr(th(''), th(''), th('m'), th('m'), th('m'), th('ton/m³'), th('ton')), ...wRows]) +
        `<p class="f" style="text-align:right">Toplam Ağırlık = <b>${n2(topW)}</b> ton<br><b>${n2(Ugs)} ton</b> ${Ugs <= topW ? '&lt;' : '&gt;'} <b>${n2(topW)} ton</b> &nbsp; ${n2(topW / U, 3)} &nbsp; Yapı Ağırlığı ${durum(Ugs <= topW)}</p>`;
    } else h += `<h3>Yüzme Tahkiki</h3><p>Yeraltı suyu temel alt kotunun altında olduğundan yüzme tahkikine gerek yoktur.</p>`;
    } // kabuk değilse
    // 9 KAYNAKLAR
    h += `<h2 class="sayfa">9. YARARLANILAN KAYNAKLAR</h2><ol class="kay"><li>TS 500 – Betonarme Yapıların Tasarım ve Yapım Kuralları, TSE, 2000.</li><li>TS 498 – Yapı Elemanlarının Boyutlandırılmasında Alınacak Yüklerin Hesap Değerleri, TSE, 1997.</li><li>Türkiye Bina Deprem Yönetmeliği (TBDY), AFAD, 2018.</li><li>DSİ – Su Tutucu Betonarme Yapıların Yapımına Ait Genel Teknik Şartname.</li><li>TS 3440 – Zararlı Kimyasal Ortamlarda Beton Yapımı.</li><li>Housner, G. W., Dynamic Pressures on Accelerated Fluid Containers, 1957; Westergaard, H. M., Water Pressures on Dams during Earthquakes, 1933.</li><li>Mononobe-Okabe dinamik toprak itkisi bağıntıları (TBDY 2018 Bölüm 16.12).</li></ol>
      <p class="k">Genel sonuç: ${r.ok ? '<b>Tüm kontroller sağlanmaktadır.</b>' : '<b class="ye">Yetersiz kontroller bulunmaktadır; kesit boyutları revize edilmelidir.</b>'}</p>`;
    $('#rapor').innerHTML = `<div class="dsi">${h}</div>`; $('#raporKutu').style.display = 'block';
  };

  window.rapor = rapor = function () { if (!R) return; return RAP().bicim === 'DSI' ? raporDsi() : eskiRapor(); };

  /* ---------- baskı biçimi (A4, Arial, sayfa numarası) ---------- */
  document.head.insertAdjacentHTML('beforeend', `<style>
  #rapor .dsi{font:11px/1.45 Arial,Helvetica,sans-serif;color:#000}
  #rapor .dsi h1.ic{text-align:left;font-size:15px;border:0;margin:0 0 14px}
  #rapor .dsi h2{font-size:13px;border:0;margin:18px 0 8px;text-transform:uppercase}
  #rapor .dsi h3{font-size:12px;margin:12px 0 6px 14px;text-decoration:underline}
  #rapor .dsi h4{font-size:11.5px;background:#ddd;padding:3px 6px;margin:12px 0 6px;width:60%}
  #rapor .dsi p{margin:6px 0 6px 14px;text-align:justify}
  #rapor .dsi .f{font-family:"Cambria Math","Times New Roman",serif;font-size:12px}
  #rapor .dsi .k{font-size:10px;color:#222}
  #rapor .dsi table{width:auto;margin:6px 0 6px 14px;font-size:10.5px}#rapor .dsi td,#rapor .dsi th{border:1px solid #000;padding:2px 6px}
  #rapor .dsi th{background:#e8e8e8;font-weight:700}
  #rapor .dsi table.kriter td,#rapor .dsi table.sem td{border:0;padding:1px 6px}#rapor .dsi table.kriter td.k{font-size:9.5px;max-width:280px}
  #rapor .dsi td.b{font-weight:700}#rapor .dsi .uy{color:#000}#rapor .dsi .ye{color:#b3261e}
  #rapor .dsi table.komb{font-size:9px}#rapor .dsi table.komb td{padding:1px 3px}
  #rapor .dsi table.yuz{width:60%}
  #rapor .dsi .kapak{text-align:center;padding:140px 0 0;font-size:22px;font-weight:700;line-height:1.5;page-break-after:always}
  #rapor .dsi .kapak .kp{margin:120px 0 40px;font-size:24px}#rapor .dsi .kapak .kb{font-size:30px;margin-top:80px}#rapor .dsi .kapak .kt{font-size:13px;font-weight:400;margin-top:60px}
  #rapor .dsi .tc{display:flex;align-items:baseline;gap:6px;margin:3px 0}#rapor .dsi .tc.l0{font-weight:700;margin-top:8px}#rapor .dsi .tc.l1{padding-left:18px}#rapor .dsi .tc i{flex:1;border-bottom:1px dotted #000}
  #rapor .dsi .ust{text-align:right;font-weight:700;font-size:10px;border-bottom:1px solid #000;padding-bottom:3px;margin-bottom:10px}
  #rapor .dsi .ayrac{display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:240mm;font-size:22px;font-weight:700;gap:10px;page-break-after:always}
  #rapor .dsi .baslikKutu{border:1px solid #000;background:#d9d9d9;text-align:center;font-weight:700;color:#00f;padding:4px;margin:8px 0 8px 14px}#rapor .dsi .baslikKutu small{color:#000}
  #rapor .dsi svg.sema{width:100%;max-width:760px;margin-left:14px;border:1px solid #999}
  #rapor .dsi .bh{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:6px 0 6px 14px;font-size:10.5px}
  #rapor .dsi .catlak{margin:8px 0 8px 14px;color:#c00}
  #rapor .dsi .iki{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #rapor .dsi img{max-width:92%;margin:6px 0 6px 14px;border:1px solid #999}
  #rapor .dsi ol.kay{margin-left:14px}
  @media print{@page{size:A4;margin:16mm 14mm 18mm;@bottom-right{content:counter(page);font:10px Arial}}}
  </style>`);
  try { if (R) rapor(); } catch (e) { }
})();

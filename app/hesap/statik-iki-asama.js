/* ArıtmaCAD — STATİK: GÖMÜLÜ ALT YAPI + ÜST YAPI İKİ AŞAMALI ÇÖZÜM (yapı türü "altUst"; statik-yapi-turu.js seçer)
   Firma kuralı (docs/tasarim-standartlari.md › "Yapı türüne göre statik çözüm yolu", 2):
   1) Üst yapı (alt yapı üst kotunun üstündeki kolon, kiriş, döşeme, çatı, vinç yolu): çerçeve modeli (statik-cerceve.js + 3B çerçeve);
      kolon ayakları alt yapı üst kotunda ankastre. Deprem TBDY 2018 rijit bodrumlu bina yaklaşımı: üst yapı kendi R / D katsayılarıyla,
      taban kesme kuvveti alt yapı üst kotundan.
   2) Alt yapı (gömülü perdeler, radye, ara döşemeler, döşeme altındaki kirişler): 3B kabuk modeli (statik-kabuk.js). Toprak, su, YAS
      yüklerine ek olarak üst yapının kolon ayağı tepkileri (N, V, M) her yük durumu için ilgili düğüme yük olarak aktarılır:
      G → G, Q → Q, deprem +X / +Y → ESX / ESY (kabuktaki atalet yönüyle aynı yöne çevrilerek; kombinasyonlarda ±). Alt yapı rijit kabul edilir:
      kendi kütlesinin ataleti ve dinamik toprak basıncı kabuğun mevcut deprem durumlarındadır.
   Hangi elemanın hangi aşamaya ait olduğu kotla belirlenir (S.yapi.altUstKot). Saf fonksiyonlar Node ile denenir (test/statik-iki-asama.test.js). */
(function (G) {
  'use strict';
  const P = G.STATIK = G.STATIK || {};
  const f2 = (v, d = 2) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d).replace('.', ','));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TOL = 0.15;

  /* üst yapı çerçevesi: kotun üstündekiler; kolonlar kotta başlar (ankastre ayak), altı alt yapıdadır */
  P.ustYapiCer = (cer, kot) => {
    if (!cer) return null; const ust = z => +z > kot + TOL;
    const kolonlar = (cer.kolonlar || []).filter(c => ust(c.zt)).map(c => Object.assign({}, c, { z0: Math.max(+c.z0, kot), altKes: +c.z0 < kot - 1e-6 }));
    return Object.assign({}, cer, { kolonlar, kirisler: (cer.kirisler || []).filter(k => ust(k.zt)), dosemeler: (cer.dosemeler || []).filter(d => ust(d.zt)),
      perdeler: (cer.perdeler || []).filter(w => ust(w.zt)).map(w => Object.assign({}, w, { z0: Math.max(+w.z0, kot) })) });
  };
  /* alt yapı kabuk modeli: kotun üstündeki kirişler çıkar (kabukta yalnız döşeme altındaki kirişler kaburga olur) */
  /* alt yapı kabuk modeli: kotun üstündeki kirişler ve döşemeler çıkar; kotun üstüne çıkan perde kotta kesilir (üst kısmı üst yapı
     çerçevesinde mesnet; ağırlığı perde boyunca alt yapı perdesinin üstüne yük olarak — P.ustPerdeYuk) */
  P.altYapiKabuk = (K, kot) => Object.assign({}, K, { kirisler: (K.kirisler || []).filter(k => +k.zt <= kot + TOL), dosemeler: (K.dosemeler || []).filter(d => +d.zt <= kot + TOL),
    walls: (K.walls || []).map(w => (+w.zt > kot + TOL ? Object.assign({}, w, { zt: kot, ztUst: +w.zt }) : w)) });
  P.ustPerdeYuk = (K, gc) => { const out = [];
    for (const w of (K.walls || [])) { if (!(w.ztUst > w.zt)) continue; const q = gc * w.t * (w.ztUst - w.zt), n = w.kapali ? w.pts.length : w.pts.length - 1;
      for (let i = 0; i < n; i++) { const a = w.pts[i], b = w.pts[(i + 1) % w.pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(L)); if (L < 1e-6) continue;
        for (let k = 0; k < m; k++) { const u = (k + 0.5) / m, z0 = [0, 0, 0, 0, 0, 0]; out.push({ id: null, no: `${w.ad || 'Perde'} üst kısmı`, x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, z: w.zt, F: { G: [0, 0, -q * L / m, 0, 0, 0], Q: z0, 'EX+': z0, 'EX-': z0, 'EY+': z0, 'EY-': z0 } }); } } }
    return out; };

  /* kolon ayağı tepkileri (alt yapıya etkiyen yük, global): [{ id, no, x, y, z, F: { G, Q, 'EX+', 'EX-', 'EY+', 'EY-' } }] — [Fx Fy Fz Mx My Mz]
     3B çerçeve analizi varsa onun uç kuvvetleri; yoksa yaklaşık yöntemin kolon kuvvetleri (N, deprem kesmesi ve taban momenti) */
  P.kolonTepki = RC => {
    if (!RC) return [];
    return RC.kolonlar.filter(c => !c.alt).map(c => {
      let F = c.tabanYuk;
      if (!F) { // yaklaşık: düşeyde N, depremde kat kesmesi ve taban momenti (TBDY eşdeğer deprem yükü dağıtımı)
        const ex = c.ME && c.ME.X || { V: 0, b: 0 }, ey = c.ME && c.ME.Y || { V: 0, b: 0 }, nX = (c.NEt && c.NEt.X) || 0, nY = (c.NEt && c.NEt.Y) || 0;
        F = { G: [0, 0, -(c.NG || 0), 0, 0, 0], Q: [0, 0, -(c.NQ || 0), 0, 0, 0], 'EX+': [ex.V, 0, -nX, 0, ex.b, 0], 'EY+': [0, ey.V, -nY, -ey.b, 0, 0] }; F['EX-'] = F['EX+']; F['EY-'] = F['EY+']; // ± ek dışmerkezlik ayrımı yaklaşık yöntemde yok
      }
      return { id: c.id, no: c.no || null, x: c.x, y: c.y, z: c.tabanZ != null ? c.tabanZ : c.z0, bx: c.bx, by: c.by, F, k3B: !!c.tabanYuk };
    }).concat(P.perdeMesnetTepki(RC));
  };
  /* kotun üstüne çıkan perdeye mesnetlenen kiriş uçlarının tepkileri (perde üst yapı çerçevesinde ankastre mesnettir): 3B'den; yoksa
     yaklaşık yöntemin kiriş mesnet tepkileri (yalnız G, Q) */
  P.perdeMesnetTepki = RC => {
    const c3 = RC && RC.deprem && RC.deprem.cer3B; if (c3 && Array.isArray(c3.perdeTepki)) return c3.perdeTepki.map(q => ({ id: null, no: 'Perde mesnedi', perde: true, x: q.x, y: q.y, z: q.z, F: q.F, k3B: true }));
    const out = []; for (const ch of (RC && RC.zincirler) || []) { if (!ch.ok0 || !ch.supN) continue; ch.supN.forEach((q, j) => { if (q.tip !== 'perde') return; const p = [ch.a[0] + ch.u[0] * q.s, ch.a[1] + ch.u[1] * q.s], z0 = [0, 0, 0, 0, 0, 0];
      out.push({ id: null, no: 'Perde mesnedi', perde: true, x: p[0], y: p[1], z: ch.z, F: { G: [0, 0, -(ch.G.R[j] || 0), 0, 0, 0], Q: [0, 0, -(ch.Q.R[j] || 0), 0, 0, 0], 'EX+': z0, 'EX-': z0, 'EY+': z0, 'EY-': z0 }, k3B: false }); }); }
    return out;
  };
  /* kabuk yük durumlarına eşleme: G → G, Q → Q; deprem: çerçevenin EX+ / EY+ durumu (+X / +Y yönünde kat kuvvetleri, +%5 dışmerkezlik)
     kabuğun ESX / ESY durumuna TERS işaretle girer — kabukta ESX "zemin +X yönünde ivmelenir" durumudur, atalet kuvvetleri −X yönündedir;
     üst yapının ataleti de aynı yönde olmalı. Kombinasyonlarda deprem ± alındığı için iki yön de hesaplanır. */
  P.KABUK_TEPKI_DURUM = { G: ['G', 1], Q: ['Q', 1], ESX: ['EX+', -1], ESY: ['EY+', -1] };
  /* −%5 ek dışmerkezlik: kabukta ayrı yalnız-düğüm-yükü durumu TX / TY = −(EX−) − (−(EX+)); kombinasyonda ESX + TX = −(EX−) tepkileri (zarf) */
  P.kabukKolonYuku = T => T.map(q => { const F = Object.fromEntries(Object.entries(P.KABUK_TEPKI_DURUM).map(([k, [c, s]]) => [k, q.F[c] ? q.F[c].map(v => s * v) : null]));
    for (const [k, a, b] of [['TX', 'EX+', 'EX-'], ['TY', 'EY+', 'EY-']]) if (q.F[a] && q.F[b]) F[k] = q.F[a].map((v, i) => v - q.F[b][i]);
    return { id: q.id, no: q.no, x: q.x, y: q.y, z: q.z, F }; });

  /* alt + üst yapı hazırlığı (pencere ve kalınlık önerisi): üst yapı çerçevesi çözülür, tepkiler alt yapı kabuğuna yük olur.
     Dönen { S (kabuk girdisi: alt yapı + kolon yükleri), RC (üst yapı çerçeve sonucu), T (tepkiler), kot } ya da null (tür altUst değilse) */
  P.ikiAsamaHazirla = S => {
    if (!S || !S.yapi || S.yapi.tur !== 'altUst' || !S.kabuk) return null;
    const kot = S.yapi.altUstKot != null ? +S.yapi.altUstKot : Math.max(...S.kabuk.walls.map(w => +w.zt));
    let RC = null, T = [];
    const cer = P.ustYapiCer(S.cer, kot);
    if (cer && ((cer.kolonlar || []).length || (cer.kirisler || []).length) && P.cerceveHesap) {
      const Su = Object.assign({}, S, { cer, suYapisi: false }); RC = P.cerceveHesap(Su); T = P.kolonTepki(RC); }
    const K = P.altYapiKabuk(S.kabuk, kot), UP = P.ustPerdeYuk(K, (S.mal && S.mal.gc) || 25); K.kolonYuk = P.kabukKolonYuku(T.concat(UP));
    return { S: Object.assign({}, S, { kabuk: K }), RC, T, UP, kot, cer };
  };

  /* tepkilerin toplamı (durum başına): [ΣFx, ΣFy, ΣFz] */
  P.tepkiToplam = (T, cas) => T.reduce((s, q) => { const f = q.F[cas]; return f ? [s[0] + f[0], s[1] + f[1], s[2] + f[2]] : s; }, [0, 0, 0]);

  /* sonuç panosu özeti */
  P.ikiAsamaOzet = IA => {
    const RC = IA.RC, tG = P.tepkiToplam(IA.T, 'G'), tQ = P.tepkiToplam(IA.T, 'Q');
    return `<div class="msg info"><b>Alt yapı + üst yapı (iki aşama)</b> · alt yapı üst kotu ${f2(IA.kot)}. Üst yapı çerçeve hesabı ${RC ? `${RC.ok ? 'UYGUN' : 'YETERSİZ'} (${RC.kolonlar.length} kolon, kolon ayakları ${f2(IA.kot)} kotunda ankastre)` : 'yok (kolon / kiriş yok)'}; ${IA.T.length} kolon ayağı tepkisi alt yapı kabuğuna yük olarak uygulandı (ΣN<sub>G</sub> = ${f2(-tG[2], 0)} kN, ΣN<sub>Q</sub> = ${f2(-tQ[2], 0)} kN). Aşağıdaki kabuk sonuçları alt yapınındır; çerçeve sonuçları en altta.</div>`;
  };

  /* rapor bölümü: çözüm yolu + aktarılan tepkiler tablosu */
  P.ikiAsamaRapor = (IA, f) => {
    f = f || f2; const T = IA.T, RC = IA.RC, D = RC && RC.deprem;
    let h = `<h2 class="sayfa">ALT YAPI + ÜST YAPI — İKİ AŞAMALI ÇÖZÜM</h2><p>Yapı, gömülü alt yapı (betonarme perdeler, radye, ara döşemeler) ve üst yapıdan (kolon, kiriş, çatı, vinç yolu) oluşur. Firma kuralı gereği iki aşamada çözülmüştür (alt yapı üst kotu <b>${f(IA.kot)}</b>; bu kotun altındaki elemanlar alt yapı, üstündekiler üst yapı):</p>
      <p><b>1. Üst yapı</b> — çerçeve modeli: ${RC ? `${RC.kolonlar.length} kolon, ${RC.zincirler.reduce((t, c) => t + c.segs.length, 0)} kiriş, ${RC.dosemeler.length} döşeme` : 'eleman yok'}. Kolon ayakları alt yapı üst kotunda ankastre kabul edilmiştir. Deprem TBDY 2018 rijit bodrumlu bina yaklaşımıyla: üst yapı kendi taşıyıcı sistem katsayılarıyla (R = ${D ? D.R : '—'}, D = ${D ? D.D : '—'}), taban kesme kuvveti alt yapı üst kotundan${D ? ` (W = ${f(D.W, 0)} kN, V<sub>t</sub> = ${f(D.Vt, 1)} kN)` : ''}.</p>
      <p><b>2. Alt yapı</b> — 3B kabuk modeli (perdeler, radye, döşemeler; döşeme altındaki kirişler ve perde içindeki kolonlar kaburga çubuk). Toprak, su ve yeraltı suyu yüklerine ek olarak üst yapının kolon ayağı tepkileri (N, V, M) her yük durumu için kolonun oturduğu perde / radye düğümüne yük olarak uygulanmıştır: G → G, Q → Q, deprem (+X / +Y, kabuktaki atalet yönüne çevrilerek) → kabuğun deprem durumları (kombinasyonlarda ±). Alt yapı rijit kabul edilmiştir; kendi kütlesinin ataleti ve dinamik toprak basıncı kabuğun deprem durumlarındadır.</p>`;
    if (T.length) {
      const sat = (q, c) => { const v = q.F[c]; return v ? `<td>${f(-v[2], 1)}</td><td>${f(v[0], 1)}</td><td>${f(v[1], 1)}</td><td>${f(v[3], 1)}</td><td>${f(v[4], 1)}</td>` : '<td colspan="5">—</td>'; };
      h += `<h3>Üst yapıdan alt yapıya aktarılan kolon ayağı tepkileri</h3><p>Alt yapıya etkiyen kuvvetler, global eksenlerde (N basınç +, kN; V kN; M kNm). Deprem: +X / +Y doğrultusundaki eşdeğer deprem yükünden (tabloda +%5 ek dışmerkezlik; −%5 dışmerkezlikli tepkiler de alt yapıya ayrı yükleme olarak aktarılır, kombinasyonlarda ± ve zarf alınır).${T.some(q => !q.k3B) ? ' Bazı kolonlarda 3B çerçeve sonucu yok: yaklaşık yöntemin kolon kuvvetleri kullanıldı.' : ''}</p><table><tr><th class="l" rowspan="2">Kolon</th><th colspan="5">G</th><th colspan="5">Q</th><th colspan="5">E (+X)</th><th colspan="5">E (+Y)</th></tr><tr>${'<th>N</th><th>Vx</th><th>Vy</th><th>Mx</th><th>My</th>'.repeat(4)}</tr>`;
      for (const q of T) h += `<tr><td class="l">${esc(q.no || ('S' + q.id))} <span style="font-size:10px">(${f(q.x)}; ${f(q.y)})</span></td>${sat(q, 'G')}${sat(q, 'Q')}${sat(q, 'EX+')}${sat(q, 'EY+')}</tr>`;
      const tG = P.tepkiToplam(T, 'G'), tQ = P.tepkiToplam(T, 'Q'), tX = P.tepkiToplam(T, 'EX+'), tY = P.tepkiToplam(T, 'EY+');
      h += `<tr><th class="l">Toplam</th><th>${f(-tG[2], 1)}</th><th>${f(tG[0], 1)}</th><th>${f(tG[1], 1)}</th><th colspan="2"></th><th>${f(-tQ[2], 1)}</th><th>${f(tQ[0], 1)}</th><th>${f(tQ[1], 1)}</th><th colspan="2"></th><th>${f(-tX[2], 1)}</th><th>${f(tX[0], 1)}</th><th>${f(tX[1], 1)}</th><th colspan="2"></th><th>${f(-tY[2], 1)}</th><th>${f(tY[0], 1)}</th><th>${f(tY[1], 1)}</th><th colspan="2"></th></tr></table>`;
      const yt = D && D.cer3B && D.cer3B.yukTop; if (yt) h += `<p>Denge: üst yapıya uygulanan düşey yük G = ${f(-yt.G, 1)} kN, Q = ${f(-yt.Q, 1)} kN; kolon ayağı tepkileri toplamı G = ${f(-tG[2], 1)} kN, Q = ${f(-tQ[2], 1)} kN. Deprem tepkileri toplamı ${f(Math.hypot(tX[0], tX[1]), 1)} / ${f(Math.hypot(tY[0], tY[1]), 1)} kN = taban kesme kuvveti.</p>`;
    } else h += `<p>Üst yapıda kolon yok: alt yapıya aktarılan kolon tepkisi yok.</p>`;
    return h;
  };
})(typeof window !== 'undefined' ? window : globalThis);

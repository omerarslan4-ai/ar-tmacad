/* ArıtmaCAD Statik — TBDY 2018 eşdeğer deprem yükü raporu (ayrı modül)
   Kiriş · kolon · döşeme raporunun deprem bölümü: bina bilgileri, analiz parametreleri, tasarım spektrumu, yük kombinasyonları,
   kat ağırlıkları, deprem yükleri (X / Y ayrı: Rayleigh periyodu, sınır periyot, SaR, Vt, kat kuvvetleri), göreli kat ötelemeleri,
   ikinci mertebe kontrolü ve isteğe bağlı başka programla (ör. ProBina) karşılaştırma tablosu.
   P.cerceveRapor içinden çağrılır: P.tbdyRapor(RC, f2). */
(function () {
  'use strict';
  const P = window.STATIK; if (!P) return;
  P.tbdyRapor = (RC, f2) => {
    const D = RC.deprem, a = RC.ayar || {}, M = RC.MAL || {}, ok = v => (v == null ? '—' : v ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'), t = v => v / 9.81;
    const C3 = D.cer3B, YX = C3 ? Object.assign({}, C3.yon.X, { TR: C3.yon.X.Tmod }) : D.yon && D.yon.X, YY = C3 ? Object.assign({}, C3.yon.Y, { TR: C3.yon.Y.Tmod }) : D.yon && D.yon.Y;
    if (!YX || !YY) return '';
    let h = `<h3>Deprem hesabı — TBDY 2018 eşdeğer deprem yükü yöntemi (Madde 4.7)${C3 ? ' · 3B çerçeve analizi' : ''}</h3>`;
    if (C3) {
      h += `<h4>Yapı modeli ve modal analiz</h4><p>Kolon ve kirişler üç boyutlu çubuk eleman (${C3.dugum} düğüm, ${C3.eleman} eleman, ${C3.sb} serbestlik); her kat kotunda rijit diyafram (kütle merkezinde ana düğüm: U<sub>X</sub>, U<sub>Y</sub>, Θ<sub>Z</sub>), kolon tabanları ankastre. Birleşimlerde rijit bölgeler %25 azaltılmış, tasarım kuvvetleri rijit bölge yüzünde. Deprem ve modal analizde etkin kesit rijitlikleri kolon ${f2(C3.kC, 2)}, kiriş ${f2(C3.kB, 2)}; düşey yüklerde çatlamamış kesit. Deprem yükleri ±%5 ek dışmerkezlikle (E<sub>X+</sub>, E<sub>X−</sub>, E<sub>Y+</sub>, E<sub>Y−</sub>) uygulanmıştır.</p>`;
      h += `<table><tr><th>Kat</th><th>Kot</th><th>Kütle m (t)</th><th>Kütle ataleti mr² (t·m²)</th><th>X<sub>G</sub> (m)</th><th>Y<sub>G</sub> (m)</th><th>B<sub>X</sub> × B<sub>Y</sub> (m)</th></tr>` + C3.kat.map((k, i) => `<tr><td>${i + 1}</td><td>${f2(k.z)}</td><td>${f2(k.m, 2)}</td><td>${f2(k.mr2, 1)}</td><td>${f2(k.xc, 3)}</td><td>${f2(k.yc, 3)}</td><td>${f2(k.Bx)} × ${f2(k.By)}</td></tr>`).reverse().join('') + `</table>`;
      h += `<table><tr><th>Mod</th><th>Periyot T (s)</th><th>Etkin kütle X (%)</th><th>Etkin kütle Y (%)</th><th>Burulma (%)</th></tr>` + C3.modlar.map((m, i) => `<tr><td>${i + 1}</td><td>${f2(m.T, 4)}</td><td>${f2(m.mx * 100, 2)}</td><td>${f2(m.my * 100, 2)}</td><td>${f2(m.mt * 100, 2)}</td></tr>`).join('') + `</table><p class="f">Her yönde hakim periyot, o yönde en büyük etkin kütleli moddur (T<sub>X</sub> = ${f2(YX.TR, 3)} s, T<sub>Y</sub> = ${f2(YY.TR, 3)} s); TBDY 4.7.3 gereği 1.4·C<sub>t</sub>·H<sub>N</sub><sup>3/4</sup> = ${f2(1.4 * C3.Temp, 3)} s ile sınırlanır.</p>`;
    }
    // bina bilgileri
    h += `<h4>Bina bilgileri</h4><table><tr><th>Kat</th><th>Kat kotu (m)</th><th>Kat yüksekliği h (m)</th><th>Tabandan H (m)</th><th>Kolon segmenti</th><th>Kat ağırlığı W = G + nQ (kN)</th><th>W (t)</th></tr>`;
    D.katlar.slice().reverse().forEach((k, i) => { h += `<tr><td>${D.katlar.length - i}</td><td>${f2(k.z)}</td><td>${f2(k.h)}</td><td>${f2(k.H)}</td><td>${k.nk}</td><td>${f2(k.w, 1)}</td><td>${f2(t(k.w), 2)}</td></tr>`; });
    h += `<tr><td colspan="5"><b>Toplam</b></td><td><b>${f2(D.W, 1)}</b></td><td><b>${f2(t(D.W), 2)}</b></td></tr></table>`;
    // analiz parametreleri
    const sat = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
    h += `<h4>Analiz parametreleri</h4><table>`
      + sat('Analiz yöntemi', 'Eşdeğer deprem yükü yöntemi (TBDY 2018 Madde 4.7), her yön için ayrı')
      + sat('Yönetmelikler', 'TBDY 2018 Türkiye Bina Deprem Yönetmeliği · TS 500:2000 Betonarme Yapıların Tasarım ve Yapım Kuralları')
      + sat('Malzeme', `Beton f<sub>ck</sub> = ${f2(M.fck, 0)} MPa (f<sub>cd</sub> = ${f2(M.fcd, 1)}, f<sub>ctd</sub> = ${f2(M.fctd, 2)}, E<sub>c</sub> = ${f2(M.Ec, 0)} MPa) · Donatı f<sub>yk</sub> = ${f2(M.fyk, 0)} MPa (f<sub>yd</sub> = ${f2(M.fyd, 1)} MPa)`)
      + sat('Deprem düzeyi DD-2 (tasarım)', `S<sub>DS</sub> = ${f2(D.SDS, 3)} · S<sub>D1</sub> = ${f2(D.SD1, 3)} · T<sub>A</sub> = ${f2(D.TA, 4)} s · T<sub>B</sub> = ${f2(D.TB, 4)} s · T<sub>L</sub> = 6 s`)
      + sat('Deprem düzeyi DD-3 (öteleme sınırı λ)', +a.SDS3 > 0 && +a.SD13 > 0 ? `S<sub>DS</sub> = ${f2(+a.SDS3, 3)} · S<sub>D1</sub> = ${f2(+a.SD13, 3)}` : 'girilmedi — λ hesaplanmadı (Kiriş / kolon / döşeme ayarlarına S<sub>DS</sub> ve S<sub>D1</sub> DD-3 girin)')
      + sat('Taşıyıcı sistem', `R = ${D.R} · D = ${D.D} · I = ${D.I} (bina önem katsayısı) · hareketli yük katılım katsayısı n = ${D.n}`)
      + sat('Etkin kesit rijitlik katsayıları (TBDY Tablo 4.2)', `kolon ${f2(D.kC, 2)} · kiriş ${f2(D.kB, 2)} · birleşimlerde rijit bölgeler %25 azaltılmış`)
      + sat('Hakim periyot', `${C3 ? '3B modal analiz (yön başına en büyük etkin kütleli mod)' : 'Rayleigh (Denklem 4.26), kat rijitlikleri kolon segmentlerinden (kiriş esnekliği Muto a katsayısı ile)'}; T ≤ 1.4·C<sub>t</sub>·H<sub>N</sub><sup>3/4</sup> = 1.4·${D.Ct}·${f2(D.HN)}<sup>0.75</sup> = ${f2(1.4 * D.Temp, 3)} s`)
      + `</table>`;
    // spektrum
    const RI = D.R / D.I, Ra = T => (T > D.TB ? RI : D.D + (RI - D.D) * T / (D.TB || 1));
    const Sae = T => (T < D.TA ? (0.4 + 0.6 * T / (D.TA || 1)) * D.SDS : T <= D.TB ? D.SDS : T <= 6 ? D.SD1 / T : D.SD1 * 6 / (T * T));
    const Ts = [...new Set([0, D.TA, D.TB, 0.5, 0.75, 1, 1.5, 2, 3, YX.T, YY.T].map(v => Math.round(v * 1e4) / 1e4))].sort((p, q) => p - q);
    h += `<h4>Yatay elastik ve azaltılmış tasarım spektrumu (DD-2)</h4><table><tr><th>T (s)</th><th>S<sub>ae</sub>(T) (g)</th><th>R<sub>a</sub>(T)</th><th>S<sub>aR</sub>(T) = S<sub>ae</sub>/R<sub>a</sub> (g)</th><th></th></tr>`
      + Ts.map(T => `<tr><td>${f2(T, 3)}</td><td>${f2(Sae(T), 4)}</td><td>${f2(Ra(T), 2)}</td><td>${f2(Sae(T) / Ra(T), 4)}</td><td>${Math.abs(T - YX.T) < 1e-4 ? 'T<sub>X</sub>' : ''}${Math.abs(T - YY.T) < 1e-4 ? ' T<sub>Y</sub>' : ''}</td></tr>`).join('') + `</table>`;
    // kombinasyonlar
    h += `<h4>Yük kombinasyonları (TS 500 · TBDY 4.4.4)</h4><table><tr><th>No</th><th>Kombinasyon</th><th>Kullanıldığı yer</th></tr>`
      + [['1', '1.4 G + 1.6 Q', 'düşey yük tasarımı (döşeme, kiriş, kolon)'], ['2–5', 'G + Q ± E<sub>X</sub> ± 0.3 E<sub>Y</sub>', 'kiriş ve kolon (X yönü depremli)'], ['6–9', 'G + Q ± E<sub>Y</sub> ± 0.3 E<sub>X</sub>', 'kiriş ve kolon (Y yönü depremli)'], ['10–13', '0.9 G ± E<sub>X</sub> (± 0.3 E<sub>Y</sub>), 0.9 G ± E<sub>Y</sub> (± 0.3 E<sub>X</sub>)', 'kolon en küçük eksenel yük / çekme'], ['—', 'V<sub>e</sub> = kapasite kesmesi (TBDY 7.4.5, 7.3.7)', 'kiriş ve kolon kesme tasarımı']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') + `</table>`;
    // deprem yükleri
    h += `<h4>Deprem yükleri</h4><table><tr><th>Yön</th><th>${C3 ? 'T<sub>modal</sub>' : 'T<sub>Rayleigh</sub>'} (s)</th><th>Sınır 1.4·T<sub>amp</sub> (s)</th><th>T (s)</th><th>S<sub>ae</sub> (g)</th><th>R<sub>a</sub></th><th>S<sub>aR</sub> (g)</th><th>W·S<sub>aR</sub> (kN)</th><th>V<sub>min</sub> = 0.04·I·S<sub>DS</sub>·W (kN)</th><th>V<sub>t</sub> (kN)</th><th>V<sub>t</sub> (t)</th></tr>`
      + [['X', YX], ['Y', YY]].map(([d, Y]) => `<tr><td>${d}</td><td>${f2(Y.TR, 3)}</td><td>${f2(Y.Tlim, 3)}</td><td><b>${f2(Y.T, 3)}</b></td><td>${f2(Y.Sae, 4)}</td><td>${f2(Y.Ra, 2)}</td><td>${f2(Y.SaR, 4)}</td><td>${f2(D.W * Y.SaR, 1)}</td><td>${f2(Y.Vmin, 1)}</td><td><b>${f2(Y.Vt, 1)}</b></td><td>${f2(t(Y.Vt), 2)}</td></tr>`).join('') + `</table>`;
    h += `<table><tr><th>Kat</th><th>Kat kotu</th><th>w (kN)</th><th>F<sub>X</sub> (kN)</th><th>V<sub>X</sub> (kN)</th><th>F<sub>Y</sub> (kN)</th><th>V<sub>Y</sub> (kN)</th></tr>`
      + D.katlar.map((k, i) => ({ k, i })).reverse().map(({ k, i }) => `<tr><td>${i + 1}</td><td>${f2(k.z)}</td><td>${f2(k.w, 1)}</td><td>${f2(YX.F[i], 1)}</td><td>${f2(YX.V[i], 1)}</td><td>${f2(YY.F[i], 1)}</td><td>${f2(YY.V[i], 1)}</td></tr>`).join('') + `</table>`
      + `<p class="f">F<sub>i</sub> = (V<sub>t</sub> − ΔF<sub>N</sub>)·w<sub>i</sub>H<sub>i</sub> / Σw<sub>j</sub>H<sub>j</sub>, ΔF<sub>N</sub> = 0.0075·N·V<sub>t</sub> (çatı katına). Kolon kesmeleri kat yer değiştirmelerinden (kolon segmenti rijitliği × göreli yer değiştirme) bulunmuştur; kirişe bağlanmadan kat geçen kolonlar her iki kat aralığında birlikte çalışır.</p>`;
    // ötelemeler
    h += `<h4>Göreli kat ötelemeleri (TBDY 4.9.1)</h4><table><tr><th>Yön</th><th>Kat</th><th>h (m)</th><th>Eleman</th><th>Δ azaltılmış (mm)</th><th>δ = Δ·R/I (mm)</th><th>δ/h</th><th>λ</th><th>λ·δ/h</th><th>Sınır 0.008κ</th><th></th></tr>`;
    for (const [d, Y] of [['X', YX], ['Y', YY]]) Y.ote.forEach((o, i) => { h += `<tr><td>${i ? '' : d}</td><td>${i + 1}</td><td>${f2(D.katlar[i].h)}</td><td>${o.el || '—'}</td><td>${f2(o.D0 * 1000, 2)}</td><td>${f2(o.de * 1000, 2)}</td><td>${f2(o.oran, 5)}</td><td>${Y.lam != null ? f2(Y.lam, 3) : '—'}</td><td>${o.lam != null ? f2(o.lam, 5) : '—'}</td><td>${f2(Y.lim, 4)}</td><td>${ok(o.ok)}</td></tr>`; });
    h += `</table><p class="f">λ = S<sub>ae</sub>(T, DD-3) / S<sub>ae</sub>(T, DD-2); dolgu duvarlar esnek derzli değilse sınır 0.008κ, κ = 1 (betonarme).</p>`;
    // ikinci mertebe
    const lim2 = 0.12 * D.D / (0.5 * D.R);
    h += `<h4>İkinci mertebe etkileri (TBDY 4.9.2)</h4><table><tr><th>Yön</th><th>Kat</th><th>Δ (m)</th><th>ΣW üstte (kN)</th><th>V<sub>i</sub> (kN)</th><th>θ = ΣW·Δ / (V·h)</th><th>Sınır 0.12·D/(C<sub>h</sub>·R)</th><th></th></tr>`;
    for (const [d, Y] of [['X', YX], ['Y', YY]]) Y.ote.forEach((o, i) => { const SW = D.katlar.slice(i).reduce((s, k) => s + k.w, 0), th = Y.V[i] > 0 ? SW * o.D0 / (Y.V[i] * D.katlar[i].h) : 0; h += `<tr><td>${i ? '' : d}</td><td>${i + 1}</td><td>${f2(o.D0, 5)}</td><td>${f2(SW, 1)}</td><td>${f2(Y.V[i], 1)}</td><td>${f2(th, 4)}</td><td>${f2(lim2, 3)}</td><td>${ok(th <= lim2)}</td></tr>`; });
    h += `</table><p class="f">C<sub>h</sub> = 0.5 (betonarme). θ sınırın altında kaldığından ikinci mertebe etkileri gözönüne alınmamıştır.</p>`;
    // karşılaştırma
    const r = k => (a[k] != null && a[k] !== '' && isFinite(+a[k]) ? +a[k] : null);
    if (['refW', 'refTX', 'refTY', 'refVX', 'refVY', 'refDX', 'refDY'].some(k => r(k) != null)) {
      const mx = Y => Math.max(...Y.ote.map(o => (o.lam != null ? o.lam : 0)));
      const sat2 = (ad, biz, ref, n) => ref == null ? '' : `<tr><td>${ad}</td><td>${f2(biz, n)}</td><td>${f2(ref, n)}</td><td>${ref ? (biz >= ref ? '+' : '') + f2((biz / ref - 1) * 100, 1) + ' %' : '—'}</td></tr>`;
      h += `<h4>Karşılaştırma — ${a.refAd || 'başka program'}</h4><table><tr><th>Büyüklük</th><th>ArıtmaCAD</th><th>${a.refAd || 'Karşılaştırma'}</th><th>Fark</th></tr>`
        + sat2('Toplam sismik ağırlık W (t)', t(D.W), r('refW'), 2) + sat2('Hakim periyot T<sub>X</sub> (s)', YX.T, r('refTX'), 3) + sat2('Hakim periyot T<sub>Y</sub> (s)', YY.T, r('refTY'), 3)
        + sat2('Taban kesme kuvveti V<sub>t,X</sub> (t)', t(YX.Vt), r('refVX'), 2) + sat2('Taban kesme kuvveti V<sub>t,Y</sub> (t)', t(YY.Vt), r('refVY'), 2)
        + sat2('En büyük λ·δ/h, X', mx(YX), r('refDX'), 5) + sat2('En büyük λ·δ/h, Y', mx(YY), r('refDY'), 5) + `</table>`
        + `<p class="f">${C3 ? 'Her iki program da üç boyutlu çerçeve modeli, rijit diyafram ve modal analizle eşdeğer deprem yükü yöntemini kullanır; farklar kütle dağılımı, döşeme yük aktarımı ve rijit bölge modellemesinden kaynaklanır.' : 'Karşılaştırma programı üç boyutlu çerçeve (modal) çözümü yapar; ArıtmaCAD kat rijitliklerine dayalı Rayleigh periyodu ve eşdeğer deprem yükü kullanır. Burulma ve döşeme kütle dağılımı farkları periyot ve taban kesmesinde %10–20 mertebesinde fark doğurabilir.'}</p>`;
    }
    return h;
  };
})();

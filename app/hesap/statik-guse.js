/* ArıtmaCAD Statik — GUSE (kolon kısa konsolu / vinç kirişi konsolu) hesabı — TS 500:2000 kısa konsol kuralları
   Yükler (Kiriş · kolon · döşeme ayarları): guseG = vinç kirişi + ray ağırlığı (kN, her guse), guseP = vinç tekerlek yükü (kN, karakteristik, darbe dahil),
   guseA = yükün kolon yüzüne uzaklığı (m, boş = çıkmanın yarısı), guseH = yatay yük (kN, boş = 0.2·V_d).
   V_d = 1.4G + 1.6P ≤ 0.2·f_cd·b·d · ana çekme donatısı A_s = max(V_d·a/(0.85·f_yd·d) + N_d/f_yd ; 2/3·A_vf + N_d/f_yd ; 0.04·f_cd/f_yd·b·d),
   A_vf = V_d/(μ·f_yd), μ = 1.4 (monolitik) · yatay etriyeler A_h ≥ 0.5·(A_s − N_d/f_yd), üst 2d/3 içinde.
   Sonuç: kolon.guseD[] (çizim ve metraj statik-kolon-pafta.js'de). */
(function () {
  'use strict';
  const P = window.STATIK; if (!P || !P.cerceveHesap) return;
  const Ab = F => Math.PI * F * F / 4e6;
  P.guseTasarim = (RC, dv, MAL) => {
    const fcd = MAL.fcd * 1000, fyd = MAL.fyd * 1000, c = 0.05, out = [];
    for (const k of RC.kolonlar) {
      if (!k.guse || !k.guse.length) continue;
      k.guseD = k.guse.map(g => {
        const G = +dv.guseG || 0, Pk = +dv.guseP || 0, Vd = 1.4 * G + 1.6 * Pk, a = dv.guseA != null && dv.guseA !== '' ? +dv.guseA : g.gL / 2, d = g.hf - c, b = g.w;
        const Nd = dv.guseH != null && dv.guseH !== '' ? 1.6 * +dv.guseH : 0.2 * Vd, Vmax = 0.2 * fcd * b * d;
        const As1 = Vd * a / (0.85 * fyd * d) + Nd / fyd, Avf = Vd / (1.4 * fyd), As2 = 2 / 3 * Avf + Nd / fyd, Amin = 0.04 * fcd / fyd * b * d, As = Math.max(As1, As2, Amin);
        let ana = null; for (const F of [16, 18, 20, 22, 25, 28]) { for (let n = 3; n <= 8; n++) { const s = (b - 2 * c - F / 1000) / (n - 1); if (s < Math.max(0.025, 1.5 * F / 1000)) break; if (n * Ab(F) >= As) { if (!ana || n * Ab(F) < ana.As) ana = { n, F, As: n * Ab(F) }; break; } } }
        const Ah = Math.max(0.5 * (As - Nd / fyd), 0); let yat = null; for (const F of [10, 12, 14, 16]) { const n = Math.max(2, Math.ceil(Ah / (2 * Ab(F)))); if ((n - 1) * 0.07 <= 2 / 3 * d) { yat = { n, F, Ah: n * 2 * Ab(F) }; break; } }
        const r = Object.assign({}, g, { kolon: k.no, G, Pk, Vd, a, d, b, Nd, Vmax, As1, As2, Amin, As, ana, Ah, yat, ok: Vd <= Vmax + 1e-9 && !!ana && !!yat && a <= d });
        out.push(r); return r;
      });
    }
    RC.guseler = out; return out;
  };
  const c0 = P.cerceveHesap;
  P.cerceveHesap = function (S, ...a) {
    const RC = c0.call(this, S, ...a);
    try { if (RC) { P.guseTasarim(RC, RC.ayar || {}, RC.MAL); if (RC.guseler.length) { if (!(+RC.ayar.guseP > 0)) RC.uyar.push(`${RC.guseler.length} guse var, ancak guse yükü girilmedi: guseler en az donatıyla boyutlandırıldı. Kiriş · kolon · döşeme ayarlarına vinç tekerlek yükünü (guseP) ve vinç kirişi ağırlığını (guseG) girin.`); if (RC.guseler.some(g => !g.ok)) { RC.ok = false; RC.uyar.push('Guse kesiti yetersiz: ' + [...new Set(RC.guseler.filter(g => !g.ok).map(g => g.kolon))].join(', ')); } } } } catch (e) { console.error('guse', e); }
    return RC;
  };
  const r0 = P.cerceveRapor;
  if (r0) P.cerceveRapor = function (RC, f2) {
    let h = r0.apply(this, arguments); const G = RC.guseler || []; if (!G.length) return h;
    const cmS = v => Math.round(v * 100), ok = v => (v ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>');
    h += `<h3>Guseler (kısa konsol — TS 500)</h3><p>Yükler: vinç kirişi + ray G = ${f2(+RC.ayar.guseG || 0, 1)} kN, vinç tekerlek yükü P = ${f2(+RC.ayar.guseP || 0, 1)} kN (her guse) · V<sub>d</sub> = 1.4G + 1.6P · N<sub>d</sub> = ${RC.ayar.guseH != null && RC.ayar.guseH !== '' ? '1.6·H' : '0.2·V<sub>d</sub>'} · μ = 1.4.</p>`
      + `<table><tr><th>Kolon</th><th>b × çıkma (cm)</th><th>h yüz / uç (cm)</th><th>üst kot</th><th>a (cm)</th><th>d (cm)</th><th>V<sub>d</sub> (kN)</th><th>V<sub>max</sub> = 0.2f<sub>cd</sub>bd</th><th>A<sub>s</sub> gerekli (cm²)</th><th>Ana donatı</th><th>A<sub>h</sub> (cm²)</th><th>Yatay etriye</th><th></th></tr>`
      + G.map(g => `<tr><td>${g.kolon || ''}</td><td>${cmS(g.b)} × ${cmS(g.gL)}</td><td>${cmS(g.hf)} / ${cmS(g.hu)}</td><td>${f2(g.zt)}</td><td>${cmS(g.a)}</td><td>${cmS(g.d)}</td><td>${f2(g.Vd, 1)}</td><td>${f2(g.Vmax, 0)} ${ok(g.Vd <= g.Vmax)}</td><td>${f2(g.As * 1e4, 2)}</td><td>${g.ana ? g.ana.n + 'Ø' + g.ana.F : '—'}</td><td>${f2(g.Ah * 1e4, 2)}</td><td>${g.yat ? g.yat.n + ' × Ø' + g.yat.F + ' (çift kol)' : '—'}</td><td>${ok(g.ok)}</td></tr>`).join('') + `</table>`
      + `<p class="f">A<sub>s</sub> = max[V<sub>d</sub>·a/(0.85·f<sub>yd</sub>·d) + N<sub>d</sub>/f<sub>yd</sub> ; 2/3·V<sub>d</sub>/(μ·f<sub>yd</sub>) + N<sub>d</sub>/f<sub>yd</sub> ; 0.04·(f<sub>cd</sub>/f<sub>yd</sub>)·b·d]. Ana donatı kolon içine kenetlenir, uçta konsol alt yüzü boyunca bükülür; yatay etriyeler üst 2d/3 içinde. Guse yükleri 3B çerçeve analizinde kolona düşey kuvvet ve dışmerkezlik momenti olarak etkitilmiştir.</p>`;
    return h;
  };
})();

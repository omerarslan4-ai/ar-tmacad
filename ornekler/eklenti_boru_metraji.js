// @name Boru metrajı (örnek eklenti)
// @desc Seçilen boruların DN ve malzemeye göre toplam uzunluğunu listeler
C.addCommand(['BORUMETRAJ'], 'Boru metrajı', async (I) => {
  const s = (await I.sel('Boruları seçin (Enter = tümü)')).filter(e => e.type === 'pipe');
  const list = s.length ? s : C.doc.ents.filter(e => e.type === 'pipe'); const t = {};
  for (const e of list) { let l = 0; for (let i = 1; i < e.pts.length; i++) l += C.M.dist(e.pts[i - 1], e.pts[i]); const k = `DN${e.dn} ${e.mat || ''}`.trim(); t[k] = (t[k] || 0) + l; }
  Object.entries(t).forEach(([k, l]) => C.log(`${k}: ${l.toFixed(2)} m`));
});
api.button('Metraj', 'BORUMETRAJ', 'Boru metrajı');

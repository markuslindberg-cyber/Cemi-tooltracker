import { mergeCheckoutAsUttag, buildArtikelMap } from '@/lib/mergeCheckoutAsUttag';

/**
 * Beräknar dynamiskt saldo per artikel-ID baserat på inköp − uttag.
 * Returnerar en Map: artikelId → saldo (number).
 * Samma logik som LokalvardLager-sidan.
 */
export function buildArtikelSaldoMap(artiklar, inkop, uttag, checkout) {
  if (checkout && checkout.length > 0) {
    const aMap = buildArtikelMap(artiklar);
    uttag = mergeCheckoutAsUttag(uttag, checkout, aMap);
  }

  // Gruppera per streckkod
  const grouped = {};
  artiklar.forEach(artikel => {
    const streckkod = artikel.streckkod;
    if (!streckkod) return;

    if (!grouped[streckkod]) {
      grouped[streckkod] = {
        benamning: artikel.benamning,
        streckkod,
        old_streckkod: artikel.old_streckkod,
        pris: artikel.pris,
        inkopsdatum: artikel.inkopsdatum,
        total_antal_inkopta: 0,
        all_artikel_ids: [],
        all_streckkoder: [streckkod],
        all_benamningar: [artikel.benamning?.toLowerCase()],
      };
    }

    const g = grouped[streckkod];
    if (new Date(artikel.inkopsdatum) > new Date(g.inkopsdatum)) {
      g.pris = artikel.pris;
      g.inkopsdatum = artikel.inkopsdatum;
      g.benamning = artikel.benamning;
      if (artikel.old_streckkod) g.old_streckkod = artikel.old_streckkod;
    } else if (!g.old_streckkod && artikel.old_streckkod) {
      g.old_streckkod = artikel.old_streckkod;
    }
    g.total_antal_inkopta += artikel.antal_inkopta;
    g.all_artikel_ids.push(artikel.id);
    if (artikel.benamning && !g.all_benamningar.includes(artikel.benamning.toLowerCase())) {
      g.all_benamningar.push(artikel.benamning.toLowerCase());
    }
  });

  // Merge groups sharing same artikelnummer
  const mergedGroups = {};
  const streckkodToMergeKey = {};
  Object.entries(grouped).forEach(([streckkod, group]) => {
    const artNr = artiklar.find(a => a.streckkod === streckkod)?.artikelnummer;
    if (artNr && streckkodToMergeKey[artNr]) {
      const existing = mergedGroups[streckkodToMergeKey[artNr]];
      existing.all_artikel_ids.push(...group.all_artikel_ids);
      existing.total_antal_inkopta += group.total_antal_inkopta;
      existing.all_streckkoder.push(streckkod);
      group.all_benamningar.forEach(b => {
        if (!existing.all_benamningar.includes(b)) existing.all_benamningar.push(b);
      });
      if (!existing.old_streckkod) existing.old_streckkod = streckkod;
    } else {
      mergedGroups[streckkod] = { ...group };
      if (artNr) streckkodToMergeKey[artNr] = streckkod;
    }
  });

  // Calculate saldo per group
  const saldoMap = new Map();
  Object.values(mergedGroups).forEach(g => {
    const allStreckkoder = g.all_streckkoder || [g.streckkod];
    if (g.old_streckkod && !allStreckkoder.includes(g.old_streckkod)) {
      allStreckkoder.push(g.old_streckkod);
    }

    const matchingInkop = inkop.filter(i =>
      g.all_artikel_ids.includes(i.artikel_id) ||
      allStreckkoder.includes(i.artikel_id)
    );
    const totalInkopt = matchingInkop.reduce((sum, i) => sum + i.antal, 0);
    const inkoptToUse = totalInkopt > 0 ? totalInkopt : g.total_antal_inkopta;

    const totalUttag = uttag.reduce((sum, u) => {
      const items = u.artiklar?.filter(item => {
        if (item.benamning && g.all_benamningar.includes(item.benamning.toLowerCase())) return true;
        if (item.benamning && allStreckkoder.includes(item.benamning)) return true;
        if (g.all_artikel_ids.includes(item.artikel_id)) return true;
        if (item.artikel_id && allStreckkoder.includes(item.artikel_id)) return true;
        return false;
      }) || [];
      return sum + items.reduce((s, i) => s + (i.antal || 0), 0);
    }, 0);

    const saldo = Math.max(0, inkoptToUse - totalUttag);
    // Assign same saldo to all artikel IDs in the group
    g.all_artikel_ids.forEach(id => saldoMap.set(id, saldo));
  });

  return saldoMap;
}
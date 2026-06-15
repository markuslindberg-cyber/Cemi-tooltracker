/**
 * Grupperar LokalvardsArtikel-poster per streckkod och slår ihop grupper
 * som delar samma artikelnummer (t.ex. ny och gammal streckkod för samma produkt).
 *
 * Returnerar en array av grupperade objekt med:
 *   id, benamning, artikelnummer, streckkod, old_streckkod, pris, inkopsdatum,
 *   lagertroskelvarde, utgaende, subcategory,
 *   total_antal_inkopta, total_current_quantity,
 *   all_artikel_ids, all_streckkoder, all_benamningar
 */
export function groupArtiklarByStreckkod(artiklar) {
  // Steg 1: Gruppera efter streckkod
  const groupedByStreckkod = {};

  artiklar.forEach(artikel => {
    const streckkod = artikel.streckkod;
    if (!streckkod) return;

    if (!groupedByStreckkod[streckkod]) {
      groupedByStreckkod[streckkod] = {
        id: artikel.id,
        benamning: artikel.benamning,
        artikelnummer: artikel.artikelnummer,
        streckkod: artikel.streckkod,
        old_streckkod: artikel.old_streckkod,
        pris: artikel.pris,
        inkopsdatum: artikel.inkopsdatum,
        lagertroskelvarde: artikel.lagertroskelvarde,
        utgaende: !!artikel.utgaende,
        subcategory: artikel.subcategory,
        total_antal_inkopta: 0,
        total_current_quantity: 0,
        all_artikel_ids: [],
        all_streckkoder: [streckkod],
        all_benamningar: [artikel.benamning?.toLowerCase()],
      };
    }

    const currentGroup = groupedByStreckkod[streckkod];

    // Prioritera nyaste artikeln (eller aktiv framför utgående)
    const currentIsUtgaende = currentGroup.utgaende;
    const newIsUtgaende = !!artikel.utgaende;
    const isNewer = new Date(artikel.inkopsdatum) > new Date(currentGroup.inkopsdatum || '1970-01-01');
    const shouldReplace = (!newIsUtgaende && currentIsUtgaende) || (newIsUtgaende === currentIsUtgaende && isNewer);

    if (shouldReplace) {
      currentGroup.id = artikel.id;
      currentGroup.benamning = artikel.benamning;
      currentGroup.artikelnummer = artikel.artikelnummer;
      currentGroup.pris = artikel.pris || currentGroup.pris;
      currentGroup.inkopsdatum = artikel.inkopsdatum;
      currentGroup.lagertroskelvarde = artikel.lagertroskelvarde;
      currentGroup.utgaende = newIsUtgaende;
      currentGroup.subcategory = artikel.subcategory;
      if (artikel.old_streckkod) currentGroup.old_streckkod = artikel.old_streckkod;
    } else if (!currentGroup.old_streckkod && artikel.old_streckkod) {
      currentGroup.old_streckkod = artikel.old_streckkod;
    }

    currentGroup.total_antal_inkopta += artikel.antal_inkopta || 0;
    currentGroup.total_current_quantity += artikel.current_quantity || 0;
    currentGroup.all_artikel_ids.push(artikel.id);
    if (artikel.benamning && !currentGroup.all_benamningar.includes(artikel.benamning.toLowerCase())) {
      currentGroup.all_benamningar.push(artikel.benamning.toLowerCase());
    }
  });

  // Steg 2: Slå ihop grupper som delar samma artikelnummer
  const mergedGroups = {};
  const streckkodToMergeKey = {};

  Object.entries(groupedByStreckkod).forEach(([streckkod, group]) => {
    const artNr = group.artikelnummer;

    if (artNr && streckkodToMergeKey[artNr]) {
      const existingKey = streckkodToMergeKey[artNr];
      const existingGroup = mergedGroups[existingKey];

      existingGroup.all_artikel_ids.push(...group.all_artikel_ids);
      existingGroup.total_antal_inkopta += group.total_antal_inkopta;
      existingGroup.total_current_quantity += group.total_current_quantity;
      existingGroup.all_streckkoder.push(streckkod);
      group.all_benamningar.forEach(b => {
        if (!existingGroup.all_benamningar.includes(b)) existingGroup.all_benamningar.push(b);
      });
      if (!existingGroup.old_streckkod) existingGroup.old_streckkod = streckkod;

      // Använd nyaste data som huvud
      if (new Date(group.inkopsdatum) > new Date(existingGroup.inkopsdatum)) {
        existingGroup.id = group.id;
        existingGroup.benamning = group.benamning;
        existingGroup.streckkod = group.streckkod;
        existingGroup.pris = group.pris;
        existingGroup.inkopsdatum = group.inkopsdatum;
        existingGroup.lagertroskelvarde = group.lagertroskelvarde;
        existingGroup.utgaende = group.utgaende;
        existingGroup.subcategory = group.subcategory;
      }
    } else {
      mergedGroups[streckkod] = { ...group };
      if (artNr) streckkodToMergeKey[artNr] = streckkod;
    }
  });

  return Object.values(mergedGroups);
}
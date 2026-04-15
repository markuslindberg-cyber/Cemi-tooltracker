export const calculateUttagMatching = (allUttag, allArtiklar, targetStreckkod, targetOldStreckkod) => {
  return allUttag.reduce((sum, u) => {
    const matchingWithdrawals = u.artiklar?.filter(item =>
      item.artikel_id === targetStreckkod ||
      item.artikel_id === targetOldStreckkod ||
      allArtiklar.some(a =>
        (a.streckkod === targetStreckkod ||
          a.old_streckkod === targetStreckkod ||
          a.streckkod === targetOldStreckkod ||
          a.old_streckkod === targetOldStreckkod) &&
        (a.id === item.artikel_id ||
          a.streckkod === item.artikel_id ||
          a.old_streckkod === item.artikel_id)
      )
    ) || [];
    return sum + matchingWithdrawals.reduce((s, a) => s + (a.antal || 0), 0);
  }, 0);
};
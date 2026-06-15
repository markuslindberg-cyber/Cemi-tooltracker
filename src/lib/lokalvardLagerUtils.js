import { mergeCheckoutAsUttag, buildArtikelMap } from '@/lib/mergeCheckoutAsUttag';
import { groupArtiklarByStreckkod } from '@/lib/groupArtiklarByStreckkod';

/**
 * Beräknar totalt lagervärde för lokalvårdsartiklar baserat på inköp − uttag.
 */
export function calculateLokalvardLagerValue(artiklar, uttag, inkop, checkout) {
  if (checkout && checkout.length > 0) {
    const aMap = buildArtikelMap(artiklar);
    uttag = mergeCheckoutAsUttag(uttag, checkout, aMap);
  }

  const groups = groupArtiklarByStreckkod(artiklar);

  let totalValue = 0;
  for (const g of groups) {
    const allStreckkoder = g.all_streckkoder || [g.streckkod];
    if (g.old_streckkod && !allStreckkoder.includes(g.old_streckkod)) {
      allStreckkoder.push(g.old_streckkod);
    }
    const allBenamningar = g.all_benamningar || [g.benamning?.toLowerCase()];

    const matchingInkop = inkop.filter(i =>
      g.all_artikel_ids.includes(i.artikel_id) ||
      allStreckkoder.includes(i.artikel_id)
    );
    const totalInkopt = matchingInkop.reduce((sum, i) => sum + i.antal, 0);
    const inkoptToUse = totalInkopt > 0 ? totalInkopt : g.total_antal_inkopta;

    const totalUttag = uttag.reduce((sum, u) => {
      const items = u.artiklar?.filter(item => {
        if (item.benamning && allBenamningar.includes(item.benamning.toLowerCase())) return true;
        if (item.benamning && allStreckkoder.includes(item.benamning)) return true;
        if (g.all_artikel_ids.includes(item.artikel_id)) return true;
        if (item.artikel_id && allStreckkoder.includes(item.artikel_id)) return true;
        return false;
      }) || [];
      return sum + items.reduce((s, i) => s + (i.antal || 0), 0);
    }, 0);

    const saldo = Math.max(0, inkoptToUse - totalUttag);
    totalValue += saldo * (g.pris || 0);
  }

  return totalValue;
}
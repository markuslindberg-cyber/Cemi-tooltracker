/**
 * Converts LokalvardCheckout records to the same format as Uttag records,
 * then merges them with the existing Uttag array.
 *
 * The LokalvardUttag page already does this inline – this utility centralises
 * the logic so that Lager, Produktstatistik, ArtikelDetaljer and the
 * lagervärde-utility can all include checkout-based withdrawals.
 */
export function mergeCheckoutAsUttag(uttagArray, checkoutArray, artikelMap) {
  if (!checkoutArray || checkoutArray.length === 0) return uttagArray;

  const checkoutAsUttag = checkoutArray.map(co => {
    const dateStr = co.checked_out_date || new Date().toISOString();

    const artiklar = (co.checked_out_items || []).map(item => {
      let foundArtikel = artikelMap[item.item_id];
      if (!foundArtikel && item.barcode) foundArtikel = artikelMap[item.barcode];
      if (!foundArtikel && item.name) {
        const lowerName = item.name.toLowerCase();
        foundArtikel = Object.values(artikelMap).find(
          a => a && a.benamning && a.benamning.toLowerCase() === lowerName
        );
      }

      const pris = foundArtikel?.pris || item.price || 0;
      const antal = item.scanned_quantity || item.quantity || 0;

      return {
        artikel_id: foundArtikel?.id || item.item_id || '',
        benamning: foundArtikel?.benamning || item.name || item.barcode,
        antal,
        pris_per_enhet: pris,
        total_pris: antal * pris,
      };
    });

    return {
      id: `checkout-${co.id}`,
      datum: dateStr,
      personal_namn: co.checked_out_by_name,
      kund_id: co.customer_id,
      kund_namn: co.customer_name,
      artiklar,
      total_kostnad: artiklar.reduce((s, a) => s + a.total_pris, 0),
      manad: dateStr.substring(0, 7),
    };
  });

  return [...uttagArray, ...checkoutAsUttag];
}

/**
 * Builds an artikelMap keyed by id, streckkod, old_streckkod and lower-case benamning.
 */
export function buildArtikelMap(artiklar) {
  const map = {};
  artiklar.forEach(a => {
    map[a.id] = a;
    if (a.streckkod) map[a.streckkod] = a;
    if (a.old_streckkod) map[a.old_streckkod] = a;
    if (a.benamning) map[a.benamning.toLowerCase()] = a;
  });
  return map;
}
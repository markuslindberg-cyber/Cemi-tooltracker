import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const barcode = body.barcode;

    if (!barcode) {
      return Response.json({ error: 'Barcode parameter required' }, { status: 400 });
    }

    // Hämta alla artiklar
    const allArtiklar = await base44.entities.LokalvardsArtikel.list(null, 10000);
    
    // Filtrera artiklar som matchar streckkoden (exakt eller liknande)
    const matchingArticles = allArtiklar.filter(a => {
      const artikelBarcode = (a.streckkod || '').trim();
      return artikelBarcode === barcode || artikelBarcode.includes(barcode);
    });

    // Detaljerad analys av varje match
    const details = matchingArticles.map(a => {
      const barcodeStr = a.streckkod || '';
      return {
        id: a.id,
        benamning: a.benamning,
        streckkod: a.streckkod,
        streckkodLength: barcodeStr.length,
        antal_inkopta: a.antal_inkopta,
        current_quantity: a.current_quantity,
        pris: a.pris,
        inkopsdatum: a.inkopsdatum,
        trimmedBarcode: barcodeStr.trim(),
        hasLeadingSpace: barcodeStr[0] === ' ',
        hasTrailingSpace: barcodeStr[barcodeStr.length - 1] === ' ',
        charCodes: Array.from(barcodeStr).map(c => c.charCodeAt(0)),
      };
    });

    return Response.json({
      searchBarcode: barcode,
      matchCount: matchingArticles.length,
      details: details,
      message: matchingArticles.length > 1 ? `⚠️ Hittat ${matchingArticles.length} artiklar med denna streckkod!` : 'OK'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows, fileUrl } = await req.json();

    // Hämta artiklar och befintliga inköp
    const [artiklar, befintligaInköp] = await Promise.all([
      base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
      base44.entities.LokalvardInköp.list(null, 10000).catch(() => [])
    ]);

    const processedResults = [];

    for (const row of rows) {
      if (!row.streckkod || !row.datum || row.antal === undefined || row.pris === undefined) {
        processedResults.push({
          ...row,
          status: 'error',
          message: 'Saknade obligatoriska fält'
        });
        continue;
      }

      // Hitta artikeln
      const artikel = artiklar.find(a => 
        a.streckkod === row.streckkod || a.old_streckkod === row.streckkod
      );

      if (!artikel) {
        processedResults.push({
          ...row,
          status: 'error',
          message: `Artikel med streckkod ${row.streckkod} hittades inte`
        });
        continue;
      }

      // Kontrollera duplikat
      const befintligt = befintligaInköp.find(i => 
        i.artikel_id === artikel.id && i.datum === row.datum && i.antal === row.antal
      );

      if (befintligt) {
        processedResults.push({
          ...row,
          artikelNamn: artikel.benamning,
          status: 'skipped',
          message: 'Inköp med samma datum och antal existerar redan'
        });
        continue;
      }

      // Skapa inköpet
      try {
        await base44.entities.LokalvardInköp.create({
          artikel_id: artikel.id,
          datum: row.datum,
          antal: parseInt(row.antal),
          pris: parseFloat(row.pris)
        });
        processedResults.push({
          ...row,
          artikelNamn: artikel.benamning,
          status: 'success',
          message: 'Inköp tillagt'
        });
      } catch (err) {
        processedResults.push({
          ...row,
          artikelNamn: artikel.benamning,
          status: 'error',
          message: `Kunde inte spara inköp: ${err.message}`
        });
      }
    }

    const successCount = processedResults.filter(r => r.status === 'success').length;
    const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
    const errorCount = processedResults.filter(r => r.status === 'error').length;

    return Response.json({
      results: processedResults,
      summary: { successCount, skippedCount, errorCount }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
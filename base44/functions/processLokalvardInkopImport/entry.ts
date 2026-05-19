import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin_lokalvård', 'admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin lokalvård, admin eller ägare krävs' }, { status: 403 });
    }

    const { rows } = await req.json();

    // Hämta befintliga inköp för duplikatkoll
    const befintligaInköp = await base44.entities.LokalvardInköp.list(null, 10000).catch(() => []);

    const processedResults = [];

    for (const row of rows) {
      // Ignorerade rader
      if (row.action === 'ignore') {
        processedResults.push({ ...row, status: 'skipped', message: 'Ignorerad av användaren' });
        continue;
      }

      if (!row.datum || row.antal === undefined || row.pris === undefined) {
        processedResults.push({ ...row, status: 'error', message: 'Saknade obligatoriska fält' });
        continue;
      }

      let artikelId = null;
      let artikelNamn = null;

      // Fall 1: Koppla till befintlig matchad artikel
      if (row.matchedArtikel) {
        artikelId = row.matchedArtikel.id;
        artikelNamn = row.matchedArtikel.benamning;
      }
      // Fall 2: Skapa ny artikel
      else if (row.action === 'create' && row.newArtikelData) {
        const d = row.newArtikelData;
        if (!d.benamning || !d.streckkod) {
          processedResults.push({ ...row, status: 'error', message: 'Ny artikel saknar benämning eller streckkod' });
          continue;
        }
        const nyttArtikel = await base44.entities.LokalvardsArtikel.create({
          benamning: d.benamning,
          artikelnummer: d.artikelnummer || '',
          streckkod: d.streckkod,
          pris: parseFloat(d.pris) || 0,
          inkopsdatum: d.inkopsdatum || row.datum,
          antal_inkopta: parseInt(d.antal_inkopta) || parseInt(row.antal) || 0,
          lagertroskelvarde: parseInt(d.lagertroskelvarde) || 10,
          current_quantity: parseInt(d.antal_inkopta) || parseInt(row.antal) || 0,
        });
        artikelId = nyttArtikel.id;
        artikelNamn = nyttArtikel.benamning;
      } else {
        processedResults.push({ ...row, status: 'error', message: 'Ingen artikel kopplad – hoppar över' });
        continue;
      }

      // Kontrollera duplikat
      const befintligt = befintligaInköp.find(i =>
        i.artikel_id === artikelId && i.datum === row.datum && i.antal === row.antal
      );
      if (befintligt) {
        processedResults.push({ ...row, artikelNamn, status: 'skipped', message: 'Inköp med samma datum och antal existerar redan' });
        continue;
      }

      // Skapa inköpet
      try {
        await base44.entities.LokalvardInköp.create({
          artikel_id: artikelId,
          datum: row.datum,
          antal: parseInt(row.antal),
          pris: parseFloat(row.pris)
        });

        // Uppdatera lagersaldo på artikeln
        try {
          const artiklar = await base44.entities.LokalvardsArtikel.filter({ id: artikelId });
          if (artiklar && artiklar.length > 0) {
            const a = artiklar[0];
            await base44.entities.LokalvardsArtikel.update(artikelId, {
              current_quantity: (a.current_quantity || 0) + parseInt(row.antal),
              antal_inkopta: (a.antal_inkopta || 0) + parseInt(row.antal),
            });
          }
        } catch (_) {
          // Lagersaldo-uppdatering är icke-kritisk
        }

        processedResults.push({ ...row, artikelNamn, status: 'success', message: 'Inköp tillagt' });
      } catch (err) {
        processedResults.push({ ...row, artikelNamn, status: 'error', message: `Kunde inte spara inköp: ${err.message}` });
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
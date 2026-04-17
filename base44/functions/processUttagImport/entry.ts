import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'No records provided' }, { status: 400 });
    }

    const results = [];

    for (const row of rows) {
      if (row.action === 'ignore') {
        results.push({ ...row, status: 'skipped', message: 'Ignorerad av användaren' });
        continue;
      }

      const quantity = parseFloat(row.antal) || 0;
      const pricePerUnit = parseFloat(row.pris) || 0;
      const totalPrice = quantity * pricePerUnit;
      const manad = row.datum ? row.datum.substring(0, 7) : '';

      const uttagRecord = {
        datum: new Date(row.datum).toISOString(),
        personal_id: row.matchedPersonal?.id || '',
        personal_namn: row.personal_namn || '',
        kund_id: row.matchedKund?.id || '',
        kund_namn: row.kund_namn || '',
        ordernummer: row.ordernummer || null,
        artiklar: [{
          artikel_id: row.matchedArtikel?.id || '',
          benamning: row.matchedArtikel?.benamning || row.streckkod || '',
          antal: quantity,
          pris_per_enhet: pricePerUnit,
          total_pris: totalPrice
        }],
        total_kostnad: totalPrice,
        manad
      };

      try {
        await base44.entities.Uttag.create(uttagRecord);
        results.push({ ...row, status: 'success', message: 'Importerad' });
      } catch (err) {
        results.push({ ...row, status: 'error', message: err.message });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
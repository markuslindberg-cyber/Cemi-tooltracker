import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uttagRecords } = await req.json();
    if (!Array.isArray(uttagRecords) || uttagRecords.length === 0) {
      return Response.json({ error: 'No records provided' }, { status: 400 });
    }

    const [personal, kunder, artiklar] = await Promise.all([
      base44.entities.TeamMember.list(null, 10000).catch(() => []),
      base44.entities.Kund.list(null, 10000).catch(() => []),
      base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => [])
    ]);

    const personalMap = {};
    personal.forEach(p => {
      personalMap[p.name] = p.id;
    });

    const kundeMap = {};
    kunder.forEach(k => {
      kundeMap[k.namn] = k.id;
    });

    const artikelMap = {};
    artiklar.forEach(a => {
      artikelMap[a.streckkod] = a;
      artikelMap[a.artikelnummer] = a;
      if (a.old_streckkod) {
        artikelMap[a.old_streckkod] = a;
      }
    });

    const processedRecords = uttagRecords.map(record => {
      const artikel = artikelMap[record.streckkod];
      const quantity = parseFloat(record.antal) || 0;
      const pricePerUnit = parseFloat(record.pris) || 0;
      const totalPrice = quantity * pricePerUnit;

      return {
        datum: record.datum,
        personal_id: '',
        personal_namn: record.personal,
        kund_id: '',
        kund_namn: record.kund,
        ordernummer: record.ordernummer || null,
        artiklar: [{
          artikel_id: artikel?.id || '',
          benamning: artikel?.benamning || record.streckkod,
          antal: quantity,
          pris_per_enhet: pricePerUnit,
          total_pris: totalPrice
        }],
        total_kostnad: totalPrice,
        manad: record.månad
      };
    });

    const created = await base44.entities.Uttag.bulkCreate(processedRecords);

    return Response.json({
      success: true,
      created: created.length,
      records: created
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
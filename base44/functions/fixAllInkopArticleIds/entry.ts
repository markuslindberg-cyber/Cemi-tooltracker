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

    const allInkop = await base44.entities.LokalvardInköp.list(null, 10000);
    const allArtiklar = await base44.entities.LokalvardsArtikel.list(null, 10000);

    // Skapa lookup-map
    const artiklarMap = {};
    allArtiklar.forEach(a => {
      if (a.streckkod) artiklarMap[a.streckkod] = a.id;
      if (a.artikelnummer) artiklarMap[a.artikelnummer] = a.id;
      if (a.old_streckkod) artiklarMap[a.old_streckkod] = a.id;
    });

    let fixed = 0;
    const errors = [];

    for (const inkop of allInkop) {
      const correctId = artiklarMap[inkop.artikel_id];
      
      if (correctId && correctId !== inkop.artikel_id) {
        try {
          await base44.entities.LokalvardInköp.update(inkop.id, {
            artikel_id: correctId
          });
          fixed++;
        } catch (err) {
          errors.push({
            inköp_id: inkop.id,
            error: err.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      totalProcessed: allInkop.length,
      fixed: fixed,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
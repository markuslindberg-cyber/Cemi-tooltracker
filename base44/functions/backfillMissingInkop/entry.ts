import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'ägare' && user?.role !== 'admin_lokalvård') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all articles and all existing inkop records
    const articles = await base44.entities.LokalvardsArtikel.filter({}, null, 100000);
    const existingInkop = await base44.entities.LokalvardInköp.filter({}, null, 100000);

    // Build a set of article IDs that already have at least one inkop
    const articlesWithInkop = new Set();
    existingInkop.forEach(ink => {
      if (ink.artikel_id) articlesWithInkop.add(ink.artikel_id);
    });

    // Find articles missing an inkop record
    const missing = articles.filter(a => !articlesWithInkop.has(a.id));

    if (missing.length === 0) {
      return Response.json({ message: 'Inga artiklar saknar inköpsposter.', created: 0 });
    }

    // Create inkop records for missing articles
    const created = [];
    for (const article of missing) {
      const inkopData = {
        artikel_id: article.id,
        datum: article.inkopsdatum || article.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        antal: article.antal_inkopta || article.current_quantity || 0,
        pris: article.pris || 0,
      };
      const result = await base44.entities.LokalvardInköp.create(inkopData);
      created.push({
        artikel_id: article.id,
        benamning: article.benamning,
        inkop_id: result.id,
        ...inkopData,
      });
    }

    return Response.json({
      message: `Skapade ${created.length} saknade inköpsposter.`,
      created: created.length,
      details: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allInkop = await base44.entities.LokalvardInköp.list(null, 10000);
    
    // Gruppera efter artikel_id + datum + antal + pris
    const grouped = {};
    allInkop.forEach(inkop => {
      const key = `${inkop.artikel_id}|${inkop.datum}|${inkop.antal}|${inkop.pris}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(inkop);
    });

    let deletedCount = 0;
    const deletedIds = [];

    // För varje grupp med duplikat, behåll den första (äldsta) och ta bort resten
    for (const [key, items] of Object.entries(grouped)) {
      if (items.length > 1) {
        // Sortera efter ID (alphabetically) för konsistens
        items.sort((a, b) => a.id.localeCompare(b.id));
        
        // Ta bort alla utom den första
        for (let i = 1; i < items.length; i++) {
          try {
            await base44.entities.LokalvardInköp.delete(items[i].id);
            deletedCount++;
            deletedIds.push(items[i].id);
          } catch (e) {
            console.error(`Kunde inte ta bort ${items[i].id}:`, e.message);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Tog bort ${deletedCount} duplikat inköp`,
      deletedIds,
      totalProcessed: allInkop.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
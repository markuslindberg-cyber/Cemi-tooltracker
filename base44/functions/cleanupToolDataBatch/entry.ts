import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { batchSize = 50 } = await req.json().catch(() => ({}));
    
    // Get all active tools
    const allTools = await base44.asServiceRole.entities.Tool.list('-created_date', 2000);
    const activeTools = allTools.filter(t => !t.is_deleted);

    // Mark for deletion: sold/retired/missing status
    const toDelete = activeTools
      .filter(t => t.status === 'sålda' || t.status === 'retired' || t.status === 'missing')
      .map(t => t.id);

    // Process in batches
    let processed = 0;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      for (const id of batch) {
        await base44.asServiceRole.entities.Tool.update(id, {
          is_deleted: true,
          deleted_at: new Date().toISOString()
        });
        processed++;
      }
      // Small delay between batches
      await new Promise(r => setTimeout(r, 100));
    }

    return Response.json({ 
      deleted_count: processed,
      remaining: activeTools.length - processed
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
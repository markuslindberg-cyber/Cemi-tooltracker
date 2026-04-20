import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled function: permanently delete items soft-deleted more than 30 days ago
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const results = { Tool: 0, HandTool: 0, ArbetskläderUtrustning: 0, LokalvardsArtikel: 0 };

  const entityNames = ['Tool', 'HandTool', 'ArbetskläderUtrustning', 'LokalvardsArtikel'];

  for (const entityName of entityNames) {
    const items = await base44.asServiceRole.entities[entityName].filter(
      { is_deleted: true },
      null,
      10000
    );

    const toDelete = items.filter(item => item.deleted_at && item.deleted_at < thirtyDaysAgo);

    for (const item of toDelete) {
      await base44.asServiceRole.entities[entityName].delete(item.id);
      results[entityName]++;
    }
  }

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  console.log(`Permanent deletion complete: ${total} items deleted`, results);

  return Response.json({ success: true, deleted: results, total });
});
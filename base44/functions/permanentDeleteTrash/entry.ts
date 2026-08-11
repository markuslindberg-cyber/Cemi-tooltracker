import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scheduled function: permanently delete items soft-deleted more than 30 days ago
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Always require authentication (scheduled automations pass auth headers)
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

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
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
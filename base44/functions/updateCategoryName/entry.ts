import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'ägare'].includes(user.role)) {
    return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
  }

  const { categoryId, oldName, newName, entityType } = await req.json();

  if (!oldName || !newName || !entityType || oldName === newName) {
    return Response.json({ error: 'Ogiltiga parametrar' }, { status: 400 });
  }

  let updatedCount = 0;

  // Update Category entity name
  await base44.asServiceRole.entities.Category.update(categoryId, { name: newName });

  // Update items in the correct entity
  const entityMap = {
    Tool: base44.asServiceRole.entities.Tool,
    HandTool: base44.asServiceRole.entities.HandTool,
    'ArbetskläderUtrustning': base44.asServiceRole.entities.ArbetskläderUtrustning,
    LokalvardsArtikel: null, // LokalvardsArtikel has no category field
  };

  const entity = entityMap[entityType];
  if (entity) {
    const items = await entity.list(null, 100000);
    const toUpdate = items.filter(item => item.category === oldName);
    for (const item of toUpdate) {
      await entity.update(item.id, { category: newName });
      updatedCount++;
    }
  }

  return Response.json({ success: true, updatedCount });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { categoryId, oldSubcat, newSubcat, entityType, categoryName } = await req.json();

  if (!oldSubcat || !newSubcat || !entityType || oldSubcat === newSubcat) {
    return Response.json({ error: 'Ogiltiga parametrar' }, { status: 400 });
  }

  let updatedCount = 0;

  // Update subcategory list in Category entity
  const cat = await base44.asServiceRole.entities.Category.get(categoryId);
  const newSubs = (cat.subcategories || []).map(s => s === oldSubcat ? newSubcat : s);
  await base44.asServiceRole.entities.Category.update(categoryId, { subcategories: newSubs });

  const entityMap = {
    Tool: base44.asServiceRole.entities.Tool,
    HandTool: base44.asServiceRole.entities.HandTool,
    'ArbetskläderUtrustning': base44.asServiceRole.entities.ArbetskläderUtrustning,
    LokalvardsArtikel: base44.asServiceRole.entities.LokalvardsArtikel,
  };

  const entity = entityMap[entityType];
  if (entity) {
    const items = await entity.list(null, 100000);
    const toUpdate = items.filter(item => {
      const matchesSubcat = item.subcategory === oldSubcat;
      if (entityType === 'LokalvardsArtikel') return matchesSubcat;
      return matchesSubcat && item.category === categoryName;
    });
    for (const item of toUpdate) {
      await entity.update(item.id, { subcategory: newSubcat });
      updatedCount++;
    }
  }

  return Response.json({ success: true, updatedCount });
});
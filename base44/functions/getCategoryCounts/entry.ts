import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [tools, handTools, arbetsklader, lokalvard] = await Promise.all([
    base44.asServiceRole.entities.Tool.list(null, 100000),
    base44.asServiceRole.entities.HandTool.list(null, 100000),
    base44.asServiceRole.entities.ArbetskläderUtrustning.list(null, 100000),
    base44.asServiceRole.entities.LokalvardsArtikel.list(null, 100000),
  ]);

  // Count per "EntityType::CategoryName"
  const counts = {};

  const addCount = (items, entityType, categoryField) => {
    for (const item of items) {
      const catName = categoryField ? item[categoryField] : entityType;
      if (!catName) continue;
      const key = `${entityType}::${catName}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  };

  addCount(tools, 'Tool', 'category');
  addCount(handTools, 'HandTool', 'category');
  addCount(arbetsklader, 'ArbetskläderUtrustning', 'category');
  addCount(lokalvard, 'LokalvardsArtikel', null);

  return Response.json({ counts });
});
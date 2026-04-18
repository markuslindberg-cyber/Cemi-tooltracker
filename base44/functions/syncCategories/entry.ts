import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITY_PAGE_MAP = {
  Tool: 'Maskiner / Inventarie',
  HandTool: 'Handredskap',
  'ArbetskläderUtrustning': 'Arbetskläder',
  LokalvardsArtikel: 'Lokalvård – Lager',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch all relevant entity data in parallel
  const [tools, handTools, arbetsklader, lokalvard] = await Promise.all([
    base44.asServiceRole.entities.Tool.list(null, 100000),
    base44.asServiceRole.entities.HandTool.list(null, 100000),
    base44.asServiceRole.entities.ArbetskläderUtrustning.list(null, 100000),
    base44.asServiceRole.entities.LokalvardsArtikel.list(null, 100000),
  ]);

  const sources = [
    { items: tools, entityType: 'Tool', categoryField: 'category', subcategoryField: 'subcategory' },
    { items: handTools, entityType: 'HandTool', categoryField: 'category', subcategoryField: 'subcategory' },
    { items: arbetsklader, entityType: 'ArbetskläderUtrustning', categoryField: 'category', subcategoryField: 'subcategory' },
    { items: lokalvard, entityType: 'LokalvardsArtikel', categoryField: null, subcategoryField: 'subcategory' },
  ];

  // Build category map: { "EntityType::CategoryName": Set(subcategories) }
  const categoryMap = {};

  for (const { items, entityType, categoryField, subcategoryField } of sources) {
    for (const item of items) {
      const catName = categoryField ? item[categoryField] : entityType;
      if (!catName) continue;
      const key = `${entityType}::${catName}`;
      if (!categoryMap[key]) categoryMap[key] = { entityType, name: catName, subcategories: new Set() };
      if (subcategoryField && item[subcategoryField]) {
        categoryMap[key].subcategories.add(item[subcategoryField]);
      }
    }
  }

  // Fetch existing categories
  const existing = await base44.asServiceRole.entities.Category.list(null, 100000);
  const existingMap = {};
  for (const cat of existing) {
    existingMap[`${cat.entity_type}::${cat.name}`] = cat;
  }

  let created = 0, updated = 0;

  for (const [key, { entityType, name, subcategories }] of Object.entries(categoryMap)) {
    const subcatArray = Array.from(subcategories).filter(Boolean).sort();
    const pageLabel = ENTITY_PAGE_MAP[entityType] || entityType;

    if (existingMap[key]) {
      // Merge subcategories (don't overwrite if more exist)
      const existingSubs = new Set(existingMap[key].subcategories || []);
      subcatArray.forEach(s => existingSubs.add(s));
      await base44.asServiceRole.entities.Category.update(existingMap[key].id, {
        subcategories: Array.from(existingSubs).sort(),
        page_label: pageLabel,
      });
      updated++;
    } else {
      await base44.asServiceRole.entities.Category.create({
        name,
        entity_type: entityType,
        subcategories: subcatArray,
        page_label: pageLabel,
      });
      created++;
    }
  }

  return Response.json({ success: true, created, updated });
});
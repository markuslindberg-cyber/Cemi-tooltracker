import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Try different name variants
  const results = {};
  
  try {
    const r = await base44.asServiceRole.entities['ArbetskläderUtrustning'].list(null, 5);
    results['ArbetskläderUtrustning'] = r.length;
  } catch(e) { results['ArbetskläderUtrustning'] = 'ERROR: ' + e.message; }

  try {
    const r = await base44.asServiceRole.entities['Arbetskl\u00e4derUtrustning'].list(null, 5);
    results['unicode_ä'] = r.length;
    if (r.length > 0) results['sample'] = { category: r[0].category, name: r[0].name };
  } catch(e) { results['unicode_ä'] = 'ERROR: ' + e.message; }

  return Response.json(results);
});
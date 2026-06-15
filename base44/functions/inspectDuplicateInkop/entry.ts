import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin_lokalvård', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id1, id2 } = await req.json();

    if (!id1 || !id2) {
      return Response.json({ error: 'Missing id1 or id2 in request payload' }, { status: 400 });
    }

    const ink1 = await base44.entities.LokalvardInköp.get(id1);
    const ink2 = await base44.entities.LokalvardInköp.get(id2);

    // Jämför alla fält
    const allKeys = new Set([...Object.keys(ink1), ...Object.keys(ink2)]);
    const diff = {};

    for (const key of allKeys) {
      if (JSON.stringify(ink1[key]) !== JSON.stringify(ink2[key])) {
        diff[key] = {
          ink1: ink1[key],
          ink2: ink2[key]
        };
      }
    }

    return Response.json({
      ink1,
      ink2,
      differences: diff,
      hasDifferences: Object.keys(diff).length > 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
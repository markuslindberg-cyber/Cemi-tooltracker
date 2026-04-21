import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [kunder, artiklar] = await Promise.all([
      base44.asServiceRole.entities.Kund.list(null, 10000),
      base44.asServiceRole.entities.LokalvardsArtikel.list('-updated_date', 10000),
    ]);

    return Response.json({ kunder, artiklar });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
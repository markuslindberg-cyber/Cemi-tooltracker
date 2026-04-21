import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Om action=create, skapa en WorkwearRequest
    if (body.action === 'createRequest') {
      const created = await base44.asServiceRole.entities.WorkwearRequest.create(body.data);
      return Response.json({ created });
    }

    // Annars hämta all data
    const [kunder, artiklar, teamMembers, previousRequests] = await Promise.all([
      base44.asServiceRole.entities.Kund.list(null, 10000),
      base44.asServiceRole.entities.LokalvardsArtikel.list('-updated_date', 10000),
      base44.asServiceRole.entities.TeamMember.list(null, 10000),
      base44.asServiceRole.entities.WorkwearRequest.list('-request_date', 200),
    ]);

    return Response.json({ kunder, artiklar, teamMembers, previousRequests });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
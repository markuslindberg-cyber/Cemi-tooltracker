import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin_lokalvård', 'admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin lokalvård, admin eller ägare krävs' }, { status: 403 });
    }

    const [uttag, personal, kunder] = await Promise.all([
      base44.asServiceRole.entities.Uttag.list(null, 10000),
      base44.asServiceRole.entities.TeamMember.list(null, 10000),
      base44.asServiceRole.entities.Kund.list(null, 10000)
    ]);

    const personalMap = {};
    personal.forEach(p => {
      personalMap[p.name] = p.id;
    });

    const kundeMap = {};
    kunder.forEach(k => {
      kundeMap[k.namn] = k.id;
    });

    let updated = 0;
    for (const u of uttag) {
      const personalId = personalMap[u.personal_namn] || u.personal_id;
      const kundeId = kundeMap[u.kund_namn] || u.kund_id;

      if (personalId !== u.personal_id || kundeId !== u.kund_id) {
        await base44.asServiceRole.entities.Uttag.update(u.id, {
          personal_id: personalId,
          kund_id: kundeId
        });
        updated++;
      }
    }

    return Response.json({ success: true, updated, total: uttag.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
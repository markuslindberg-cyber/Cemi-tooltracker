import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Bygg artikelMap
    const artiklar = await base44.asServiceRole.entities.LokalvardsArtikel.list(null, 100000);
    const artikelMap = {};
    artiklar.forEach(a => {
      artikelMap[a.id] = a;
      if (a.streckkod) artikelMap[a.streckkod] = a;
      if (a.old_streckkod) artikelMap[a.old_streckkod] = a;
    });

    // Hämta alla uttag
    const uttag = await base44.asServiceRole.entities.Uttag.list(null, 100000);

    // Hitta omatchade
    const toDelete = [];
    for (const u of uttag) {
      const artiklarList = u.artiklar || [];
      if (artiklarList.length === 0) continue;
      const allUnmatched = artiklarList.every(a => {
        const found = (a.artikel_id && artikelMap[a.artikel_id]) || (a.benamning && artikelMap[a.benamning]);
        return !found;
      });
      if (allUnmatched) toDelete.push(u.id);
    }

    // Radera via HTTP direkt (kringgår RLS med service role token)
    const appId = Deno.env.get('BASE44_APP_ID');
    const serviceToken = req.headers.get('x-service-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    let deleted = 0;
    const errors = [];

    for (const id of toDelete) {
      try {
        // Använd entities API direkt
        const resp = await fetch(`https://api.base44.com/api/apps/${appId}/entities/Uttag/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': req.headers.get('authorization') || '',
            'x-user-token': req.headers.get('x-user-token') || '',
          }
        });
        if (resp.ok || resp.status === 404) {
          deleted++;
        } else {
          const body = await resp.text();
          errors.push({ id, status: resp.status, body: body.slice(0, 200) });
        }
      } catch (e) {
        errors.push({ id, error: e.message });
      }
    }

    return Response.json({
      total_uttag: uttag.length,
      identified: toDelete.length,
      deleted,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
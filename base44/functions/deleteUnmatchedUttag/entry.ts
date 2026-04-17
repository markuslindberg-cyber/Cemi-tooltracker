import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hämta alla artiklar och bygg upp en lookup-map (samma logik som frontend)
    const artiklar = await base44.asServiceRole.entities.LokalvardsArtikel.list(null, 100000);
    const artikelMap = {};
    artiklar.forEach(a => {
      artikelMap[a.id] = a;
      if (a.streckkod) artikelMap[a.streckkod] = a;
      if (a.old_streckkod) artikelMap[a.old_streckkod] = a;
    });

    // Hämta alla uttag
    const uttag = await base44.asServiceRole.entities.Uttag.list(null, 100000);

    // Hitta uttag där ALLA artiklar är omatchade (samma logik som frontend: artikelMap[artikel_id] || artikelMap[benamning])
    const toDelete = [];
    for (const u of uttag) {
      const artiklarList = u.artiklar || [];
      if (artiklarList.length === 0) continue;

      const allUnmatched = artiklarList.every(a => {
        const found = (a.artikel_id && artikelMap[a.artikel_id]) || (a.benamning && artikelMap[a.benamning]);
        return !found;
      });

      if (allUnmatched) {
        toDelete.push(u.id);
      }
    }

    console.log(`Hittade ${toDelete.length} omatchade uttag av ${uttag.length} totalt`);

    // Radera omatchade uttag
    let deleted = 0;
    for (const id of toDelete) {
      try {
        await base44.asServiceRole.entities.Uttag.delete(id);
        deleted++;
      } catch (e) {
        console.log('Skip delete error for id', id, e.message);
      }
    }

    return Response.json({
      success: true,
      total_checked: uttag.length,
      found_unmatched: toDelete.length,
      deleted,
      message: `${deleted} omatchade uttag raderades av totalt ${uttag.length}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
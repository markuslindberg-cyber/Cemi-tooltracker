import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'ägare', 'admin_lokalvård'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dryRun = true } = await req.json().catch(() => ({}));

    const articles = await base44.entities.LokalvardsArtikel.filter({}, null, 100000);
    const allInkop = await base44.entities.LokalvardInköp.filter({}, null, 100000);

    // Build lookup maps
    const articleIdSet = new Set(articles.map(a => a.id));
    const lookupMap = {};
    const nameLookup = {};

    articles.forEach(a => {
      if (a.artikelnummer) lookupMap[a.artikelnummer] = a;
      if (a.streckkod) lookupMap[a.streckkod] = a;
      if (a.old_streckkod) lookupMap[a.old_streckkod] = a;
      // Name lookup (normalized)
      if (a.benamning) {
        const key = a.benamning.trim().toLowerCase();
        if (!nameLookup[key]) nameLookup[key] = a;
      }
    });

    // Find inköp where artikel_id is NOT a valid database ID
    const broken = allInkop.filter(i => i.artikel_id && !articleIdSet.has(i.artikel_id));

    const fixed = [];
    const notFound = [];

    for (const ink of broken) {
      // Try direct lookup (artikelnummer, streckkod, old_streckkod)
      let match = lookupMap[ink.artikel_id];
      let matchMethod = 'artikelnummer/streckkod';

      // If no direct match, try matching by name
      if (!match) {
        const nameKey = ink.artikel_id?.trim().toLowerCase();
        if (nameKey && nameLookup[nameKey]) {
          match = nameLookup[nameKey];
          matchMethod = 'benämning';
        }
      }

      if (match) {
        if (!dryRun) {
          await base44.entities.LokalvardInköp.update(ink.id, { artikel_id: match.id });
        }
        fixed.push({
          inkop_id: ink.id,
          old_artikel_id: ink.artikel_id,
          new_artikel_id: match.id,
          benamning: match.benamning,
          matchMethod,
          datum: ink.datum,
          antal: ink.antal,
        });
      } else {
        notFound.push({
          inkop_id: ink.id,
          artikel_id: ink.artikel_id,
          datum: ink.datum,
          antal: ink.antal,
          pris: ink.pris,
        });
      }
    }

    return Response.json({
      message: dryRun
        ? `Dry run: ${fixed.length} inköp kan fixas, ${notFound.length} har ingen matchande artikel.`
        : `Fixade ${fixed.length} inköp. ${notFound.length} kunde inte matchas.`,
      dryRun,
      totalBroken: broken.length,
      fixedCount: fixed.length,
      notFoundCount: notFound.length,
      fixed,
      notFound,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
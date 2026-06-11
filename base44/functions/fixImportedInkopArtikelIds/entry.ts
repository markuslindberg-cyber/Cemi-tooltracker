import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'ägare', 'admin_lokalvård'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dryRun = true } = await req.json().catch(() => ({}));

    // Fetch all articles and all inköp
    const articles = await base44.entities.LokalvardsArtikel.filter({}, null, 100000);
    const allInkop = await base44.entities.LokalvardInköp.filter({}, null, 100000);

    // Build lookup maps: artikelnummer → article, streckkod → article, old_streckkod → article
    const articleIdSet = new Set(articles.map(a => a.id));
    const lookupMap = {};
    articles.forEach(a => {
      if (a.artikelnummer) lookupMap[a.artikelnummer] = a;
      if (a.streckkod) lookupMap[a.streckkod] = a;
      if (a.old_streckkod) lookupMap[a.old_streckkod] = a;
      // Also try lowercase
      if (a.benamning) lookupMap[a.benamning.toLowerCase()] = a;
    });

    // Find inköp where artikel_id is NOT a valid database ID
    const broken = allInkop.filter(i => i.artikel_id && !articleIdSet.has(i.artikel_id));

    const fixed = [];
    const notFound = [];

    for (const ink of broken) {
      const match = lookupMap[ink.artikel_id] || lookupMap[ink.artikel_id?.toLowerCase()];
      if (match) {
        if (!dryRun) {
          await base44.entities.LokalvardInköp.update(ink.id, { artikel_id: match.id });
        }
        fixed.push({
          inkop_id: ink.id,
          old_artikel_id: ink.artikel_id,
          new_artikel_id: match.id,
          benamning: match.benamning,
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
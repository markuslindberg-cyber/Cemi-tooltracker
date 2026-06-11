import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'ägare', 'admin_lokalvård'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { dryRun = true } = await req.json().catch(() => ({}));

    // Fetch ALL articles including deleted ones
    const articles = await base44.entities.LokalvardsArtikel.filter({}, null, 100000);
    const allInkop = await base44.entities.LokalvardInköp.filter({}, null, 100000);

    const activeArticleIdSet = new Set(articles.filter(a => !a.is_deleted).map(a => a.id));
    const allArticleIdSet = new Set(articles.map(a => a.id));

    // Build lookup: old deleted article ID -> find matching active article by same streckkod/benamning
    const deletedArticles = articles.filter(a => a.is_deleted);
    const activeArticles = articles.filter(a => !a.is_deleted);

    // Build maps for active articles
    const activeByStreckkod = {};
    const activeByBenamning = {};
    const activeByPris = {};
    activeArticles.forEach(a => {
      if (a.streckkod) activeByStreckkod[a.streckkod] = a;
      if (a.old_streckkod) activeByStreckkod[a.old_streckkod] = a;
      if (a.benamning) {
        const key = a.benamning.trim().toLowerCase();
        if (!activeByBenamning[key]) activeByBenamning[key] = a;
      }
    });

    // Map deleted article ID -> best matching active article
    const deletedToActive = {};
    deletedArticles.forEach(del => {
      // Try streckkod match
      let match = null;
      if (del.streckkod && activeByStreckkod[del.streckkod]) {
        match = activeByStreckkod[del.streckkod];
      }
      if (!match && del.old_streckkod && activeByStreckkod[del.old_streckkod]) {
        match = activeByStreckkod[del.old_streckkod];
      }
      // Try name match
      if (!match && del.benamning) {
        const key = del.benamning.trim().toLowerCase();
        if (activeByBenamning[key]) match = activeByBenamning[key];
      }
      if (match) {
        deletedToActive[del.id] = match;
      }
    });

    // Find broken inköp
    const broken = allInkop.filter(i => i.artikel_id && !activeArticleIdSet.has(i.artikel_id));

    const fixed = [];
    const notFound = [];

    for (const ink of broken) {
      let match = null;
      let matchMethod = '';

      // Check if it points to a deleted article we can remap
      if (deletedToActive[ink.artikel_id]) {
        match = deletedToActive[ink.artikel_id];
        matchMethod = 'via borttagen artikel → aktiv match';
      }

      // Check if it points to a deleted article directly (it still exists but is_deleted)
      if (!match && allArticleIdSet.has(ink.artikel_id)) {
        const art = articles.find(a => a.id === ink.artikel_id);
        if (art && art.is_deleted) {
          // Find active equivalent
          const key = art.benamning?.trim().toLowerCase();
          if (key && activeByBenamning[key]) {
            match = activeByBenamning[key];
            matchMethod = 'borttagen artikel namn-match';
          } else if (art.streckkod && activeByStreckkod[art.streckkod]) {
            match = activeByStreckkod[art.streckkod];
            matchMethod = 'borttagen artikel streckkod-match';
          }
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
        ? `Dry run: ${fixed.length} kan fixas, ${notFound.length} omatchade kvar.`
        : `Fixade ${fixed.length} inköp. ${notFound.length} kunde inte matchas.`,
      dryRun,
      totalBroken: broken.length,
      fixedCount: fixed.length,
      notFoundCount: notFound.length,
      deletedArticlesFound: deletedArticles.length,
      remappable: Object.keys(deletedToActive).length,
      fixed: fixed.slice(0, 30),
      notFound: notFound.slice(0, 30),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
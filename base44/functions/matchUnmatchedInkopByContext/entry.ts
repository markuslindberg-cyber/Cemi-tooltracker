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
    const allUttag = await base44.entities.Uttag.filter({}, null, 100000);
    const allCheckout = await base44.entities.LokalvardCheckout.filter({}, null, 100000);

    const articleIdSet = new Set(articles.map(a => a.id));

    // Collect name hints from uttag
    const nameFromUttag = {};
    allUttag.forEach(u => {
      if (u.artiklar) {
        u.artiklar.forEach(art => {
          if (art.artikel_id && art.benamning) {
            nameFromUttag[art.artikel_id] = art.benamning;
          }
        });
      }
    });

    // Collect name hints from checkout
    const nameFromCheckout = {};
    allCheckout.forEach(c => {
      if (c.checked_out_items) {
        c.checked_out_items.forEach(item => {
          if (item.item_id && item.name) {
            nameFromCheckout[item.item_id] = item.name;
          }
        });
      }
    });

    // Build name lookup for active articles
    const activeByName = {};
    articles.forEach(a => {
      if (a.benamning) {
        const key = a.benamning.trim().toLowerCase();
        if (!activeByName[key]) activeByName[key] = a;
      }
    });

    // Find broken inköp
    const broken = allInkop.filter(i => i.artikel_id && !articleIdSet.has(i.artikel_id));

    // Group by unique artikel_id
    const groupedByArtikelId = {};
    broken.forEach(ink => {
      if (!groupedByArtikelId[ink.artikel_id]) {
        groupedByArtikelId[ink.artikel_id] = [];
      }
      groupedByArtikelId[ink.artikel_id].push(ink);
    });

    const fixed = [];
    const notFound = [];
    const analysis = [];

    for (const [oldId, records] of Object.entries(groupedByArtikelId)) {
      // Try name from uttag first, then checkout
      const nameHint = nameFromUttag[oldId] || nameFromCheckout[oldId];
      let match = null;
      let matchMethod = '';

      if (nameHint) {
        const nameKey = nameHint.trim().toLowerCase();
        if (activeByName[nameKey]) {
          match = activeByName[nameKey];
          matchMethod = `namn-match: "${nameHint}"`;
        }
      }

      analysis.push({
        oldId,
        count: records.length,
        nameHint: nameHint || null,
        matchedTo: match ? { id: match.id, benamning: match.benamning } : null,
        matchMethod: matchMethod || null,
      });

      for (const ink of records) {
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
    }

    return Response.json({
      message: dryRun
        ? `Dry run: ${fixed.length} kan fixas, ${notFound.length} omatchade kvar.`
        : `Fixade ${fixed.length} inköp. ${notFound.length} kunde inte matchas.`,
      dryRun,
      totalBroken: broken.length,
      fixedCount: fixed.length,
      notFoundCount: notFound.length,
      analysis,
      fixed: fixed.slice(0, 30),
      notFound: notFound.slice(0, 30),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
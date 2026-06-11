import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'ägare', 'admin_lokalvård'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    const broken = allInkop.filter(i => i.artikel_id && !articleIdSet.has(i.artikel_id));

    // Group by unique artikel_id
    const groups = {};
    broken.forEach(ink => {
      if (!groups[ink.artikel_id]) {
        groups[ink.artikel_id] = {
          count: 0,
          priser: new Set(),
          nameFromUttag: nameFromUttag[ink.artikel_id] || null,
          nameFromCheckout: nameFromCheckout[ink.artikel_id] || null,
        };
      }
      groups[ink.artikel_id].count++;
      if (ink.pris != null) groups[ink.artikel_id].priser.add(ink.pris);
    });

    // Build active article name lookup
    const activeByName = {};
    articles.forEach(a => {
      if (a.benamning) {
        const key = a.benamning.trim().toLowerCase();
        activeByName[key] = { id: a.id, benamning: a.benamning };
      }
    });

    const result = Object.entries(groups).map(([id, g]) => {
      const nameHint = g.nameFromUttag || g.nameFromCheckout;
      const nameKey = nameHint?.trim().toLowerCase();
      const possibleMatch = nameKey ? activeByName[nameKey] : null;

      return {
        artikel_id: id,
        count: g.count,
        priser: [...g.priser],
        nameFromUttag: g.nameFromUttag,
        nameFromCheckout: g.nameFromCheckout,
        possibleMatch,
      };
    });

    // Separate matched vs unmatched
    const canMatch = result.filter(r => r.possibleMatch);
    const cantMatch = result.filter(r => !r.possibleMatch);

    return Response.json({
      totalBroken: broken.length,
      uniqueIds: result.length,
      canMatchCount: canMatch.reduce((s, r) => s + r.count, 0),
      cantMatchCount: cantMatch.reduce((s, r) => s + r.count, 0),
      canMatch,
      cantMatch,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
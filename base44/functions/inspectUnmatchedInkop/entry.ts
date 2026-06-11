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

    const articleIdSet = new Set(articles.map(a => a.id));

    // Group broken inköp by their artikel_id
    const broken = allInkop.filter(i => i.artikel_id && !articleIdSet.has(i.artikel_id));
    
    // Group by unique artikel_id to see patterns
    const groups = {};
    broken.forEach(ink => {
      if (!groups[ink.artikel_id]) {
        groups[ink.artikel_id] = { count: 0, records: [] };
      }
      groups[ink.artikel_id].count++;
      groups[ink.artikel_id].records.push({
        inkop_id: ink.id,
        datum: ink.datum,
        antal: ink.antal,
        pris: ink.pris,
      });
    });

    // Check if any of these old IDs look like db IDs vs artikelnummer
    const looksLikeDbId = broken.filter(i => i.artikel_id?.length === 24 && /^[a-f0-9]+$/.test(i.artikel_id));
    const looksLikeOther = broken.filter(i => !(i.artikel_id?.length === 24 && /^[a-f0-9]+$/.test(i.artikel_id)));

    return Response.json({
      totalBroken: broken.length,
      uniqueArtikelIds: Object.keys(groups).length,
      looksLikeDbIdCount: looksLikeDbId.length,
      looksLikeOtherCount: looksLikeOther.length,
      otherExamples: looksLikeOther.slice(0, 10).map(i => ({ artikel_id: i.artikel_id, datum: i.datum, antal: i.antal })),
      groups: Object.entries(groups).map(([id, g]) => ({
        artikel_id: id,
        count: g.count,
        sample: g.records[0],
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
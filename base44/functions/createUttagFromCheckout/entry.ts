import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkout } = await req.json();
    if (!checkout) {
      return Response.json({ error: 'No checkout data provided' }, { status: 400 });
    }

    const artiklar = await base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []);
    const artikelMap = {};
    artiklar.forEach(a => {
      artikelMap[a.id] = a;
      artikelMap[a.streckkod] = a;
    });

    const uttagArtiklar = checkout.checked_out_items.map(item => {
      const artikel = artikelMap[item.item_id];
      const pricePerUnit = artikel?.pris || 0;
      const quantity = item.scanned_quantity || item.quantity;
      return {
        artikel_id: item.item_id,
        benamning: item.name,
        antal: quantity,
        pris_per_enhet: pricePerUnit,
        total_pris: quantity * pricePerUnit
      };
    });

    const totalCost = uttagArtiklar.reduce((sum, a) => sum + a.total_pris, 0);
    const datumStr = checkout.checked_out_date || new Date().toISOString();

    const uttagRecord = {
      datum: datumStr,
      personal_id: '',
      personal_namn: checkout.requested_by_name || checkout.checked_out_by_name,
      kund_id: checkout.customer_id,
      kund_namn: checkout.customer_name,
      ordernummer: checkout.request_id || null,
      artiklar: uttagArtiklar,
      total_kostnad: totalCost,
      manad: datumStr.substring(0, 7)
    };

    const created = await base44.entities.Uttag.create(uttagRecord);

    return Response.json({
      success: true,
      uttagId: created.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { material_id, antal, kund_namn, ordernummer, notering } = await req.json();

    if (!material_id || !antal || !kund_namn || !ordernummer) {
      return Response.json({ error: 'Saknade fält: material_id, antal, kund_namn, ordernummer krävs' }, { status: 400 });
    }

    // Fetch the material
    const materials = await base44.entities.MaterialLager.filter({ id: material_id });
    if (!materials || materials.length === 0) {
      return Response.json({ error: 'Material hittades inte' }, { status: 404 });
    }
    const material = materials[0];

    if (antal > material.antal) {
      return Response.json({ error: `Otillräckligt saldo. Finns: ${material.antal} ${material.enhet || 'st'}` }, { status: 400 });
    }

    // Create the uttag record
    const uttag = await base44.entities.MaterialUttag.create({
      material_id,
      material_benamning: material.benamning,
      material_artikelnummer: material.artikelnummer || '',
      antal,
      enhet: material.enhet || 'st',
      kund_namn,
      ordernummer,
      uttagen_av_namn: user.full_name || user.email,
      uttagen_av_email: user.email,
      datum: new Date().toISOString(),
      typ: 'uttag',
      notering: notering || null,
    });

    // Update material quantity
    const newAntal = material.antal - antal;
    await base44.entities.MaterialLager.update(material_id, { antal: newAntal });

    return Response.json({ 
      success: true, 
      uttag, 
      new_antal: newAntal 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'ägare') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find the main location
    const locations = await base44.entities.Location.filter({ name: 'Danmarksgatan pallstelage' });
    if (!locations.length) {
      return Response.json({ error: 'Huvudplatsen "Danmarksgatan pallstelage" hittades inte' }, { status: 404 });
    }
    const main = locations[0];

    // Build satellite names
    const satellites = [];

    // Entresol A-D, each 1-6
    const entresolLetters = ['A', 'B', 'C', 'D'];
    for (const letter of entresolLetters) {
      for (let i = 1; i <= 6; i++) {
        satellites.push(`Entresol ${letter}${i}`);
      }
    }

    // Maskinhall E-U with exceptions
    const maskinhallConfig = {
      E: 3, F: 3, G: 3, H: 3, I: 3, J: 3, K: 3,
      L: 2, // exception
      M: 3, N: 3,
      O: 1, // exception
      P: 2, // exception
      Q: 3, R: 3, S: 3, T: 3, U: 3,
    };
    for (const [letter, count] of Object.entries(maskinhallConfig)) {
      for (let i = 1; i <= count; i++) {
        satellites.push(`Maskinhall ${letter}${i}`);
      }
    }

    // Fetch existing satellites to avoid duplicates
    const existing = await base44.entities.Location.filter({ parent_location_id: main.id });
    const existingNames = new Set(existing.map(e => e.name));

    const toCreate = satellites.filter(name => !existingNames.has(name));

    let created = 0;
    for (const name of toCreate) {
      await base44.entities.Location.create({
        name,
        type: main.type,
        parent_location_id: main.id,
        parent_location_name: main.name,
        is_active: true,
      });
      created++;
    }

    const skipped = satellites.length - toCreate.length;

    return Response.json({
      success: true,
      total_expected: satellites.length,
      created,
      skipped,
      message: `${created} satelliter skapade, ${skipped} redan existerande.`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
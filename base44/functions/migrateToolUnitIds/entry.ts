import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'mekaniker', 'ägare'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all tools, locations, and units via service role
    const allTools = await base44.asServiceRole.entities.Tool.list('-updated_date', 10000);
    const allLocations = await base44.asServiceRole.entities.Location.list();
    const allUnits = await base44.asServiceRole.entities.Unit.list();

    // Find default unit (first active unit)
    const defaultUnit = allUnits.find(u => u.is_active !== false) || allUnits[0];
    if (!defaultUnit) {
      return Response.json({ error: 'No units found' }, { status: 400 });
    }

    // Build location_id -> { unit_id, unit_name } map
    const locationUnitMap = {};
    for (const loc of allLocations) {
      if (loc.unit_id) {
        locationUnitMap[loc.id] = { unit_id: loc.unit_id, unit_name: loc.unit_name || '' };
      }
    }

    // Filter tools that need migration (no unit_id set)
    const toolsToMigrate = allTools.filter(t => !t.unit_id);

    let updatedFromLocation = 0;
    let updatedWithDefault = 0;

    // Process in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < toolsToMigrate.length; i += BATCH_SIZE) {
      const batch = toolsToMigrate.slice(i, i + BATCH_SIZE);
      const updates = batch.map(tool => {
        const locUnit = tool.location_id ? locationUnitMap[tool.location_id] : null;
        if (locUnit) {
          updatedFromLocation++;
          return { id: tool.id, unit_id: locUnit.unit_id, unit_name: locUnit.unit_name };
        } else {
          updatedWithDefault++;
          return { id: tool.id, unit_id: defaultUnit.id, unit_name: defaultUnit.name };
        }
      });

      await base44.asServiceRole.entities.Tool.bulkUpdate(updates);
    }

    return Response.json({
      success: true,
      total_tools: allTools.length,
      migrated: toolsToMigrate.length,
      updated_from_location: updatedFromLocation,
      updated_with_default: updatedWithDefault,
      default_unit_used: defaultUnit.name,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
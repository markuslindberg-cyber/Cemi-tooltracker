import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    const { entityType, entityId } = await req.json();
    if (!entityType || !entityId) {
      return Response.json({ error: 'Missing entityType or entityId' }, { status: 400 });
    }

    let updatedCount = 0;

    if (entityType === 'TeamMember') {
      const member = await base44.asServiceRole.entities.TeamMember.get(entityId);
      if (!member) return Response.json({ error: 'Team member not found' }, { status: 404 });

      const toolsToUpdate = await base44.asServiceRole.entities.Tool.filter({ assigned_to_email: member.email });
      for (const tool of toolsToUpdate) {
        await base44.asServiceRole.entities.Tool.update(tool.id, { assigned_to_email: null, assigned_to_name: null });
      }
      updatedCount = toolsToUpdate.length;

    } else if (entityType === 'Location') {
      const tools = await base44.asServiceRole.entities.Tool.filter({ location_id: entityId });
      for (const tool of tools) {
        await base44.asServiceRole.entities.Tool.update(tool.id, { location_id: null, location_name: null });
      }
      const handTools = await base44.asServiceRole.entities.HandTool.filter({ location_id: entityId });
      for (const ht of handTools) {
        await base44.asServiceRole.entities.HandTool.update(ht.id, { location_id: null, location_name: null });
      }
      updatedCount = tools.length + handTools.length;

    } else {
      return Response.json({ error: 'Invalid entityType' }, { status: 400 });
    }

    return Response.json({ success: true, updatedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
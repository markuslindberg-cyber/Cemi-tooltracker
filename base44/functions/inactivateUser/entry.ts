import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const HIGH_PRIVILEGE_ROLES = ['admin', 'admin_lokalvård', 'admin lokalvård', 'ägare'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin' && user.role !== 'ägare') {
    return Response.json({ error: 'Behörighet saknas' }, { status: 403 });
  }

  const { targetMemberId, replacementMemberId } = await req.json();

  // Fetch the target team member
  const members = await base44.asServiceRole.entities.TeamMember.filter({ id: targetMemberId });
  const target = members[0];
  if (!target) return Response.json({ error: 'Teammedlem hittades inte' }, { status: 404 });

  const isHighPrivilege = HIGH_PRIVILEGE_ROLES.includes(target.role);

  if (isHighPrivilege && !replacementMemberId) {
    return Response.json({ error: 'Ersättare krävs för denna roll' }, { status: 400 });
  }

  // Fetch replacement member if provided
  let replacement = null;
  if (replacementMemberId) {
    const replacements = await base44.asServiceRole.entities.TeamMember.filter({ id: replacementMemberId });
    replacement = replacements[0];
    if (!replacement) return Response.json({ error: 'Ersättare hittades inte' }, { status: 404 });
  }

  const targetEmail = target.email;
  const targetId = target.id;
  const repEmail = replacement?.email || null;
  const repName = replacement?.name || null;
  const repId = replacement?.id || null;

  // 1. Inactivate the team member
  await base44.asServiceRole.entities.TeamMember.update(targetId, { is_active: false });

  // 2. Update Locations – responsible person and team member lists
  if (replacement) {
    const locations = await base44.asServiceRole.entities.Location.filter({});
    for (const loc of locations) {
      const updates = {};

      if (loc.responsible_person_id === targetId) {
        updates.responsible_person_id = repId;
        updates.responsible_person_name = repName;
        updates.responsible_person_email = repEmail;
      }

      if (loc.team_member_ids?.includes(targetId)) {
        const idx = loc.team_member_ids.indexOf(targetId);
        const newIds = [...(loc.team_member_ids || [])];
        const newNames = [...(loc.team_member_names || [])];
        newIds[idx] = repId;
        newNames[idx] = repName;
        updates.team_member_ids = newIds;
        updates.team_member_names = newNames;
      }

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Location.update(loc.id, updates);
      }
    }
  }

  // 3. Update Tools – assigned_to only (not created_by = historik)
  if (replacement && targetEmail) {
    const tools = await base44.asServiceRole.entities.Tool.filter({ assigned_to_email: targetEmail });
    for (const tool of tools) {
      await base44.asServiceRole.entities.Tool.update(tool.id, {
        assigned_to_email: repEmail,
        assigned_to_name: repName,
      });
    }

    // 4. HandTools
    const handTools = await base44.asServiceRole.entities.HandTool.filter({ assigned_to_email: targetEmail });
    for (const ht of handTools) {
      await base44.asServiceRole.entities.HandTool.update(ht.id, {
        assigned_to_email: repEmail,
        assigned_to_name: repName,
      });
    }

    // 5. LoanRequests – approver only (requested_by = historik)
    const loans = await base44.asServiceRole.entities.LoanRequest.filter({ approver_email: targetEmail });
    for (const loan of loans) {
      if (['pending'].includes(loan.status)) {
        await base44.asServiceRole.entities.LoanRequest.update(loan.id, {
          approver_email: repEmail,
          approver_name: repName,
        });
      }
    }
  }

  return Response.json({ success: true, message: `${target.name} har inaktiverats.` });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Map platform roles to TeamMember roles
function mapRole(userRole) {
  const roleMap = {
    'admin': 'admin',
    'admin_lokalvård': 'admin lokalvård',
    'lokalvårdare': 'lokalvårdare',
    'verktygsförvaltare': 'technician',
    'ägare': 'ägare',
    'user': 'lokalvårdare',
  };
  return roleMap[userRole] || 'lokalvårdare';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    // Fetch all platform users
    const users = await base44.asServiceRole.entities.User.list();

    // Fetch all existing TeamMembers
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();
    const memberByEmail = {};
    for (const m of teamMembers) {
      if (m.email) memberByEmail[m.email] = m;
    }

    let created = 0;
    let updated = 0;

    for (const user of users) {
      if (!user.email) continue;
      const mappedRole = mapRole(user.role);

      if (!memberByEmail[user.email]) {
        // Create new TeamMember
        await base44.asServiceRole.entities.TeamMember.create({
          name: user.full_name || user.email,
          email: user.email,
          role: mappedRole,
          is_active: true,
        });
        created++;
      } else {
        // Update role if it differs — but never downgrade an existing 'ägare' TeamMember
        const existing = memberByEmail[user.email];
        if (existing.role !== mappedRole && existing.role !== 'ägare') {
          await base44.asServiceRole.entities.TeamMember.update(existing.id, {
            role: mappedRole,
          });
          updated++;
        }
      }
    }

    return Response.json({ success: true, created, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Map TeamMember role names to User entity role names
function toUserRole(teamMemberRole) {
  const map = {
    'admin lokalvård': 'admin_lokalvård',
    'admin_lokalvård': 'admin_lokalvård',
    'lokalvårdare': 'lokalvårdare',
    'admin': 'admin',
    'verktygsförvaltare': 'verktygsförvaltare',
    'ägare': 'ägare',
    'mekaniker': 'mekaniker',
    'technician': 'verktygsförvaltare',
    'apprentice': 'verktygsförvaltare',
    'contractor': 'verktygsförvaltare',
  };
  return map[teamMemberRole] || 'verktygsförvaltare';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const userData = payload.data;
    if (!userData) {
      return Response.json({ error: 'No user data in payload' }, { status: 400 });
    }

    // Check if a TeamMember with this email already exists
    const existing = await base44.asServiceRole.entities.TeamMember.filter({ email: userData.email });
    if (existing && existing.length > 0) {
      const member = existing[0];
      // Sync the TeamMember role to the new User record
      if (member.role) {
        const userRole = toUserRole(member.role);
        await base44.asServiceRole.entities.User.update(userData.id, { role: userRole });
      }
      return Response.json({ message: 'TeamMember already exists, role synced', id: member.id, syncedRole: member.role });
    }

    // Create a new TeamMember based on the User data
    const newMember = await base44.asServiceRole.entities.TeamMember.create({
      name: userData.full_name || userData.email,
      email: userData.email,
      is_active: true,
    });

    return Response.json({ success: true, team_member_id: newMember.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
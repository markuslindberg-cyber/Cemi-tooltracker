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
  };
  return map[teamMemberRole] || teamMemberRole;
}

// Roles that each caller role is allowed to assign
const ASSIGNABLE_ROLES = {
  'ägare': ['admin', 'admin_lokalvård', 'lokalvårdare', 'verktygsförvaltare', 'mekaniker', 'ägare'],
  'admin': ['admin_lokalvård', 'lokalvårdare', 'verktygsförvaltare', 'mekaniker'],
  'admin_lokalvård': ['lokalvårdare'],
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const callerRole = user.role;
    const allowed = ASSIGNABLE_ROLES[callerRole];
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, role } = await req.json();
    const userRole = toUserRole(role);

    if (!allowed.includes(userRole)) {
      return Response.json({ error: `Du har inte behörighet att tilldela rollen "${userRole}"` }, { status: 403 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.list();
    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
      return Response.json({ success: false, error: 'Användaren finns inte i systemet ännu (ej inloggad)' });
    }

    await base44.asServiceRole.entities.User.update(targetUser.id, { role: userRole });
    return Response.json({ success: true, email, newRole: userRole });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
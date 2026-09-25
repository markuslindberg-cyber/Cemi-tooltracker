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

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Roles each caller role is allowed to assign (only ägare can grant privileged roles)
    const ASSIGNABLE_ROLES = {
      'ägare': ['admin', 'admin_lokalvård', 'lokalvårdare', 'verktygsförvaltare', 'mekaniker', 'ägare'],
      'admin': ['admin_lokalvård', 'lokalvårdare', 'verktygsförvaltare', 'mekaniker'],
      'mekaniker': ['admin_lokalvård', 'lokalvårdare', 'verktygsförvaltare'],
    };
    const allowed = ASSIGNABLE_ROLES[user.role];
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, old_data, event } = await req.json();

    if (!data?.email || !data?.role) {
      return Response.json({ skipped: true, reason: 'No email or role on TeamMember' });
    }

    // Skip if role didn't change (for updates)
    if (event?.type === 'update' && old_data?.role === data.role) {
      return Response.json({ skipped: true, reason: 'Role unchanged' });
    }

    const userRole = toUserRole(data.role);
    if (!allowed.includes(userRole)) {
      return Response.json({ error: `Du har inte behörighet att tilldela rollen "${userRole}"` }, { status: 403 });
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.list();
    const targetUser = users.find(u => u.email === data.email);

    if (!targetUser) {
      return Response.json({ skipped: true, reason: 'User not found (not logged in yet)' });
    }

    // Only update if role actually differs
    if (targetUser.role === userRole) {
      return Response.json({ skipped: true, reason: 'Role already matches' });
    }

    await base44.asServiceRole.entities.User.update(targetUser.id, { role: userRole });
    return Response.json({ success: true, email: data.email, oldRole: targetUser.role, newRole: userRole });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
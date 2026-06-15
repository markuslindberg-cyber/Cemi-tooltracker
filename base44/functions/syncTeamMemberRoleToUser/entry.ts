import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Map TeamMember role names to User entity role names
function toUserRole(teamMemberRole) {
  const map = {
    'admin lokalvård': 'admin_lokalvård',
    'admin_lokalvård': 'admin_lokalvård',
    'lokalvårdare': 'lokalvårdare',
    'admin': 'admin',
    'verktygsförvaltare': 'verktygsförvaltare',
    'ägare': 'ägare',
    'technician': 'verktygsförvaltare',
    'apprentice': 'user',
    'contractor': 'user',
  };
  return map[teamMemberRole] || 'user';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
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
});
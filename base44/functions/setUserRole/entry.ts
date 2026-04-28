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
  };
  return map[teamMemberRole] || teamMemberRole;
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!['admin', 'ägare', 'admin_lokalvård'].includes(user?.role)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, role } = await req.json();
    const userRole = toUserRole(role);

    // Find user by email
    const users = await base44.asServiceRole.entities.User.list();
    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
        return Response.json({ success: false, error: 'Användaren finns inte i systemet ännu (ej inloggad)' });
    }

    await base44.asServiceRole.entities.User.update(targetUser.id, { role: userRole });
    return Response.json({ success: true, email, newRole: userRole });
});
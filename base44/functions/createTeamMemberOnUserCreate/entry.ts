import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare', 'mekaniker'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const payload = await req.json();

    const userData = payload.data;
    if (!userData) {
      return Response.json({ error: 'No user data in payload' }, { status: 400 });
    }

    // Check if a TeamMember with this email already exists
    const existing = await base44.asServiceRole.entities.TeamMember.filter({ email: userData.email });
    if (existing && existing.length > 0) {
      return Response.json({ message: 'TeamMember already exists', id: existing[0].id });
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
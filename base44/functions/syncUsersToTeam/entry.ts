import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all platform users
    const users = await base44.asServiceRole.entities.User.list();

    // Fetch all existing TeamMembers
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();
    const existingEmails = new Set(teamMembers.map(m => m.email).filter(Boolean));

    let created = 0;
    for (const user of users) {
      if (!user.email || existingEmails.has(user.email)) continue;

      await base44.asServiceRole.entities.TeamMember.create({
        name: user.full_name || user.email,
        email: user.email,
        is_active: true,
      });
      created++;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
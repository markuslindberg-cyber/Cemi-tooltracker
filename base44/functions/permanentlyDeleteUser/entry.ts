import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetMemberId, userEmail } = await req.json();

    // Verify user is deleting their own account
    if (user.email !== userEmail) {
      return Response.json({ error: 'Forbidden: Can only delete your own account' }, { status: 403 });
    }

    // Delete the TeamMember record — verify it belongs to the caller
    if (targetMemberId) {
      const member = await base44.asServiceRole.entities.TeamMember.get(targetMemberId);
      if (!member || member.email !== user.email) {
        return Response.json({ error: 'Forbidden: TeamMember does not belong to you' }, { status: 403 });
      }
      await base44.asServiceRole.entities.TeamMember.delete(targetMemberId);
    }

    return Response.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    console.error('Permanent delete failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
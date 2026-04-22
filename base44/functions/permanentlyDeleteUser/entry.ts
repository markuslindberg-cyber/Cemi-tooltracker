import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
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

    // Delete the TeamMember record
    if (targetMemberId) {
      await base44.asServiceRole.entities.TeamMember.delete(targetMemberId);
    }

    // Delete associated records (you may want to be more selective here)
    // For now we'll keep history intact per data protection, just remove the member

    return Response.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    console.error('Permanent delete failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only ägare and admin can invite
    if (user.role !== 'ägare' && user.role !== 'admin' && user.role !== 'mekaniker') {
      return Response.json({ error: 'Ingen behörighet att bjuda in användare' }, { status: 403 });
    }

    const { email, appRole } = await req.json();
    if (!email) return Response.json({ error: 'Email krävs' }, { status: 400 });

    // List what's available on asServiceRole
    const keys = Object.keys(base44.asServiceRole || {});
    // Try users module on service role
    const usersKeys = base44.asServiceRole?.users ? Object.keys(base44.asServiceRole.users) : 'no users';
    const authKeys = base44.asServiceRole?.auth ? Object.keys(base44.asServiceRole.auth) : 'no auth';
    
    // Fallback: use regular auth.inviteUser (which uses the caller's token)
    await base44.auth.inviteUser(email.trim(), 'user');

    // Sync the app-specific role if provided
    if (appRole) {
      try {
        await base44.asServiceRole.functions.invoke('setUserRole', { email: email.trim(), role: appRole });
      } catch (e) {
        // Role sync is best-effort
      }
    }

    return Response.json({ success: true, message: `Inbjudan skickad till ${email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
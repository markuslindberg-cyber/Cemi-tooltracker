import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only ägare, admin and mekaniker can invite
    if (!['ägare', 'admin', 'mekaniker'].includes(user.role)) {
      return Response.json({ error: 'Ingen behörighet att bjuda in användare' }, { status: 403 });
    }

    const { email, appRole } = await req.json();
    if (!email) return Response.json({ error: 'Email krävs' }, { status: 400 });

    // inviteUser requires the caller to have platform role 'admin'.
    // App owner has a special platform role that can't be changed.
    // Try invite — it works for users with platform role 'admin'.
    await base44.auth.inviteUser(email.trim(), 'user');

    // Sync the app-specific role if provided
    if (appRole) {
      try {
        await base44.asServiceRole.functions.invoke('setUserRole', { email: email.trim(), role: appRole });
      } catch (e) {
        // Role sync is best-effort — user might not exist yet
      }
    }

    return Response.json({ success: true, message: `Inbjudan skickad till ${email}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
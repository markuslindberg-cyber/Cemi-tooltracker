import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only ägare, admin, mekaniker and admin_lokalvård can invite
    if (!['ägare', 'admin', 'mekaniker', 'admin_lokalvård'].includes(user.role)) {
      return Response.json({ error: 'Ingen behörighet att bjuda in användare' }, { status: 403 });
    }

    const { email, appRole } = await req.json();
    if (!email) return Response.json({ error: 'Email krävs' }, { status: 400 });

    // Invite via user token (requires platform admin role on the caller)
    try {
      await base44.users.inviteUser(email.trim(), 'user');
    } catch (inviteErr) {
      // If caller lacks platform admin role, send a manual email invitation as fallback
      const appId = Deno.env.get('BASE44_APP_ID');
      const appUrl = appId ? `https://${appId}.base44.app` : 'appen';
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email.trim(),
        subject: 'Du har blivit inbjuden till ToolTrack',
        body: `<p>Hej!</p><p>${user.full_name || 'En kollega'} har bjudit in dig till ToolTrack.</p><p>Klicka på länken nedan för att komma igång:</p><p><a href="${appUrl}">${appUrl}</a></p><p>Välkommen!</p>`,
      });
    }

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
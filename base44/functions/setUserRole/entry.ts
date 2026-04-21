import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'ägare') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, role } = await req.json();

    const updated = await base44.asServiceRole.entities.User.update(userId, { role });
    return Response.json({ success: true, updated });
});
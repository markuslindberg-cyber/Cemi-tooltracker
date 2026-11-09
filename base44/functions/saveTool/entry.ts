import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { pickSnapshot, TOOL_WRITE_ROLES } from '../../shared/toolAudit.ts';

// Creates/updates a Tool and records the authenticated writer server-side for the change log
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!TOOL_WRITE_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { id, data } = await req.json().catch(() => ({}));
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return Response.json({ error: 'data is required' }, { status: 400 });
    }

    const name = user.full_name || user.email;
    const writer = { writer_email: user.email, writer_name: name, written_at: new Date().toISOString() };
    const payload = { ...data, last_modified_by_email: user.email, last_modified_by_name: name };
    const Audit = base44.asServiceRole.entities.ToolAuditState;

    if (!id) {
      const created = await base44.entities.Tool.create(payload);
      await Audit.create({ tool_id: created.id, snapshot: {}, ...writer });
      return Response.json(created);
    }

    const before = await base44.entities.Tool.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!before) return Response.json({ error: 'Tool not found' }, { status: 404 });

    const [state] = await Audit.filter({ tool_id: id }, '-updated_date', 1);
    if (state) await Audit.update(state.id, writer);
    else await Audit.create({ tool_id: id, snapshot: pickSnapshot(before), ...writer });

    const updated = await base44.entities.Tool.update(id, payload);
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
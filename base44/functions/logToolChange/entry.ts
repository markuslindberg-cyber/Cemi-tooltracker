import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { TRACKED_FIELDS, pickSnapshot, TOOL_WRITE_ROLES } from '../../shared/toolAudit.ts';

const FIVE_MIN = 5 * 60 * 1000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!TOOL_WRITE_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Only the event type and tool id are read from the payload; old values and attribution come from the server
    const { event, data } = await req.json().catch(() => ({}));
    if (!event || !data) return Response.json({ error: 'Missing event or data' }, { status: 400 });

    const tool_id = event.entity_id || data.id;
    const storedTool = await base44.asServiceRole.entities.Tool.get(tool_id).catch(() => null);
    if (!storedTool) return Response.json({ error: 'Tool not found' }, { status: 404 });

    const lastWrite = new Date(storedTool.updated_date || storedTool.created_date).getTime();
    if (Date.now() - lastWrite > FIVE_MIN) {
      return Response.json({ error: 'No recent change to log' }, { status: 409 });
    }

    const Audit = base44.asServiceRole.entities.ToolAuditState;
    const findState = async () => (await Audit.filter({ tool_id }, '-updated_date', 1))[0];
    let state = await findState();
    if (!state && event.type === 'create') {
      // saveTool records the writer right after creating the tool
      await new Promise((r) => setTimeout(r, 2000));
      state = await findState();
    }

    // Attribution only from the server-recorded writer (set by saveTool from the authenticated caller)
    const fresh = state?.writer_email && state.written_at && Date.now() - new Date(state.written_at).getTime() < FIVE_MIN;
    const changed_by_email = fresh ? state.writer_email : 'system';
    const changed_by_name = fresh ? (state.writer_name || state.writer_email) : 'System';

    const current = pickSnapshot(storedTool);
    if (!state) {
      await Audit.create({ tool_id, snapshot: current });
      if (event.type !== 'create') return Response.json({ success: true, logsCreated: 0, baseline: true });
    }

    const previous = event.type === 'create' ? {} : (state?.snapshot || {});
    const change_date = new Date().toISOString();
    const change_type = event.type === 'create' ? 'created' : 'updated';
    const logsToCreate = TRACKED_FIELDS
      .filter((f) => (previous[f] || '') !== current[f])
      .map((f) => ({
        tool_id, changed_by_email, changed_by_name, change_date,
        field_name: f, old_value: previous[f] || '', new_value: current[f], change_type,
      }));

    if (logsToCreate.length > 0) await base44.asServiceRole.entities.ToolLog.bulkCreate(logsToCreate);
    if (state) await Audit.update(state.id, { snapshot: current, writer_email: null, writer_name: null, written_at: null });

    return Response.json({ success: true, logsCreated: logsToCreate.length });
  } catch (error) {
    console.error('Error logging tool change:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
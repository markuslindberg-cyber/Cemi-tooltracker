import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { event, data, old_data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const ALLOWED_ROLES = ['verktygsförvaltare', 'admin', 'mekaniker', 'admin_lokalvård', 'ägare'];
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tool_id = event.entity_id || data.id;
    const change_date = new Date().toISOString();

    // Use the stored tool record (not client-supplied data) for attribution
    const storedTool = await base44.asServiceRole.entities.Tool.get(tool_id).catch(() => null);
    if (!storedTool) {
      return Response.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Only log tools that were actually just written (prevents forged history on arbitrary tools)
    const lastWrite = new Date(storedTool.updated_date || storedTool.created_date).getTime();
    if (Date.now() - lastWrite > 5 * 60 * 1000) {
      return Response.json({ error: 'No recent change to log' }, { status: 409 });
    }

    // Look up the user who made the change
    let changed_by_email = 'system';
    let changed_by_name = 'System';
    const userId = storedTool.created_by_id;
    if (storedTool.last_modified_by_email) {
      changed_by_email = storedTool.last_modified_by_email;
      changed_by_name = storedTool.last_modified_by_name || storedTool.last_modified_by_email;
    } else if (userId && !userId.startsWith('service_')) {
      try {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        if (users.length > 0) {
          changed_by_email = users[0].email || 'system';
          changed_by_name = users[0].full_name || users[0].email || 'System';
        }
      } catch (e) {
        changed_by_email = 'system';
        changed_by_name = 'System';
      }
    }

    // Fields to track changes for
    const fieldsToTrack = [
      'name', 'manufacturer', 'model_number', 'serial_number', 'tool_number',
      'category', 'subcategory', 'status', 'condition',
      'purchase_date', 'purchase_price', 'purchase_location',
      'invoice_number', 'location_name',
      'satellite_location_name',
      'assigned_to_name',
      'main_machine_name', 'barcode', 'image_url', 'notes',
      'depreciation_level', 'service_cost'
    ];

    const logsToCreate = [];

    if (event.type === 'create') {
      fieldsToTrack.forEach(field => {
        if (storedTool[field] !== undefined && storedTool[field] !== null && storedTool[field] !== '') {
          logsToCreate.push({
            tool_id,
            changed_by_email,
            changed_by_name,
            change_date,
            field_name: field,
            old_value: '',
            new_value: String(storedTool[field]),
            change_type: 'created',
          });
        }
      });
    } else if (event.type === 'update' && old_data) {
      fieldsToTrack.forEach(field => {
        const oldVal = old_data[field];
        // New values always come from the stored record, never the payload
        const newVal = storedTool[field];

        const oldStr = (oldVal === null || oldVal === undefined || oldVal === '') ? '' : String(oldVal);
        const newStr = (newVal === null || newVal === undefined || newVal === '') ? '' : String(newVal);

        if (oldStr !== newStr) {
          logsToCreate.push({
            tool_id,
            changed_by_email,
            changed_by_name,
            change_date,
            field_name: field,
            old_value: oldStr,
            new_value: newStr,
            change_type: 'updated',
          });
        }
      });
    }

    if (logsToCreate.length > 0) {
      await base44.asServiceRole.entities.ToolLog.bulkCreate(logsToCreate);
    }

    return Response.json({ success: true, logsCreated: logsToCreate.length });
  } catch (error) {
    console.error('Error logging tool change:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
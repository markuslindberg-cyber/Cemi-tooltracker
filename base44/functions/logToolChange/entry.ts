import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const tool_id = data.id;
    const changed_by_email = user.email;
    const changed_by_name = user.full_name || 'Unknown';
    const change_date = new Date().toISOString();

    // Fields to track changes for (exclude certain system fields)
    const fieldsToTrack = [
      'name', 'manufacturer', 'model_number', 'category', 'subcategory',
      'status', 'condition', 'purchase_date', 'purchase_price', 'purchase_location',
      'invoice_number', 'location_id', 'location_name', 'assigned_to_email', 'assigned_to_name',
      'main_machine_id', 'main_machine_name', 'barcode', 'image_url', 'notes'
    ];

    const logsToCreate = [];

    if (event.type === 'create') {
      // For new tools, log all provided fields
      fieldsToTrack.forEach(field => {
        if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
          logsToCreate.push({
            tool_id,
            changed_by_email,
            changed_by_name,
            change_date,
            field_name: field,
            old_value: '',
            new_value: String(data[field]),
            change_type: 'created',
          });
        }
      });
    } else if (event.type === 'update' && old_data) {
      // For updates, only log fields that actually changed
      fieldsToTrack.forEach(field => {
        const oldVal = old_data[field];
        const newVal = data[field];

        // Convert to strings for comparison, treat null and empty string as equivalent
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
});
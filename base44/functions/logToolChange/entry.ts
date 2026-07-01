import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const tool_id = event.entity_id || data.id;
    const change_date = new Date().toISOString();

    // Try to get the user who made the change from data's updated_by or created_by
    const changed_by_email = data.updated_by || data.created_by_id || 'system';
    const changed_by_name = changed_by_email;

    // Fields to track changes for
    const fieldsToTrack = [
      'name', 'manufacturer', 'model_number', 'serial_number', 'tool_number',
      'category', 'subcategory', 'status', 'condition',
      'purchase_date', 'purchase_price', 'purchase_location',
      'invoice_number', 'location_id', 'location_name',
      'satellite_location_id', 'satellite_location_name',
      'assigned_to_email', 'assigned_to_name',
      'main_machine_id', 'main_machine_name', 'barcode', 'image_url', 'notes',
      'depreciation_level', 'service_cost'
    ];

    const logsToCreate = [];

    if (event.type === 'create') {
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
      fieldsToTrack.forEach(field => {
        const oldVal = old_data[field];
        const newVal = data[field];

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
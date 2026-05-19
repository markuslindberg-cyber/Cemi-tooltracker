import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['verktygsförvaltare', 'admin', 'admin_lokalvård', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Verktygsförvaltare, admin eller ägare krävs' }, { status: 403 });
    }

    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Inga rader att importera' }, { status: 400 });
    }

    const results = [];
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const withRetry = async (fn, retries = 5, delay = 2000) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (err) {
          if (err?.status === 429 && attempt < retries) {
            await sleep(delay * (attempt + 1));
          } else {
            throw err;
          }
        }
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Pause after every row to stay within rate limits
      if (i > 0) {
        await sleep(300);
      }
      try {
        const toolData = {
          name: row.name || '',
          manufacturer: row.manufacturer || '',
          model_number: row.model_number || '',
          serial_number: row.serial_number || '',
          tool_number: row.tool_number || '',
          category: row.category || '',
          subcategory: row.subcategory || '',
          status: row.status || 'available',
          condition: row.condition || 'good',
          barcode: row.barcode || '',
          purchase_date: row.purchase_date || null,
          purchase_price: parseFloat(row.purchase_price) || 0,
          purchase_location: row.purchase_location || '',
          invoice_number: row.invoice_number || '',
          service_cost: parseFloat(row.service_cost) || 0,
          location_id: row.location_id || '',
          location_name: row.location_name || '',
          assigned_to_name: row.assigned_to_name || '',
          notes: row.notes || '',
        };

        if (row.action === 'update' && row.matchedTool?.id) {
          const updateData = {};
          const changes = row.changes || {};
          for (const [field, change] of Object.entries(changes)) {
            updateData[field] = change.new;
          }
          if (Object.keys(updateData).length === 0) {
            results.push({ barcode: row.barcode, name: row.name, action: 'update', status: 'skipped', message: 'Inga ändringar att spara' });
            continue;
          }
          await withRetry(() => base44.asServiceRole.entities.Tool.update(row.matchedTool.id, updateData));
          results.push({ barcode: row.barcode, name: row.name, action: 'update', status: 'success', message: `Uppdaterad: ${Object.keys(updateData).join(', ')}` });
        } else if (row.action === 'create') {
          await withRetry(() => base44.asServiceRole.entities.Tool.create(toolData));
          results.push({ barcode: row.barcode, name: row.name, action: 'create', status: 'success', message: 'Skapad' });
        } else {
          results.push({ barcode: row.barcode, name: row.name, action: row.action, status: 'skipped', message: 'Ignorerad' });
        }
      } catch (err) {
        results.push({ barcode: row.barcode, name: row.name, action: row.action, status: 'error', message: err.message });
      }
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
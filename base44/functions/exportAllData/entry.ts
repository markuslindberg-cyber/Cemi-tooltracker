import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'ägare') {
      return Response.json({ error: 'Forbidden: Ägare access required' }, { status: 403 });
    }

    const entityNames = [
      'Tool', 'HandTool', 'ArbetskläderUtrustning', 'LokalvardsArtikel',
      'Location', 'TeamMember', 'Kund', 'Huvudmaskin',
      'WorkwearRequest', 'LokalvardArtikelRequest', 'LoanRequest',
      'LokalvardCheckout', 'Uttag', 'LokalvardInköp',
      'ServiceRecord', 'ServiceTemplate', 'Transfer',
      'InventorySession', 'InventoryReport', 'Inventering', 'InventeringSkanning',
      'CheckoutReport', 'Category', 'CategoryImage',
      'DepreciationSetting', 'ToolLog', 'RolePermission',
      'GlobalAppConfig', 'SpreadsheetCell',
    ];

    const result = {
      exported_at: new Date().toISOString(),
      exported_by: user.email,
    };

    for (const name of entityNames) {
      try {
        const records = await base44.asServiceRole.entities[name].list('-created_date', 10000);
        result[name] = records;
      } catch {
        result[name] = [];
      }
    }

    const jsonStr = JSON.stringify(result, null, 2);
    const today = new Date().toISOString().split('T')[0];

    return new Response(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=tooltrack-export-${today}.json`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
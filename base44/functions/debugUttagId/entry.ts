import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Testa delete direkt på ett känt omatchat ID
    const testId = '69df5f8615240df1503cdbb1';
    
    // Verifiera att det finns
    let found = null;
    try {
      found = await base44.asServiceRole.entities.Uttag.get(testId);
    } catch (e) {
      return Response.json({ error: 'get failed: ' + e.message });
    }

    // Försök radera
    try {
      const result = await base44.asServiceRole.entities.Uttag.delete(testId);
      return Response.json({ success: true, deleted: testId, result });
    } catch (e) {
      return Response.json({ delete_error: e.message, found_before: !!found });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
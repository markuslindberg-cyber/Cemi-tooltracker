import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin eller ägare krävs' }, { status: 403 });
    }

    // Categories to migrate
    const categoriesToMigrate = ['0 Ah', '0Ah', '1Ah', '2Ah', '4Ah', 'power_tools', 'hand_tools'];
    
    // Fetch and migrate each category one at a time
    let totalMigrated = 0;
    
    for (const oldCategory of categoriesToMigrate) {
      const tools = await base44.asServiceRole.entities.Tool.filter({ category: oldCategory }, '-updated_date', 50);
      
      if (tools.length > 0) {
        // Update sequentially with longer delay
        for (const tool of tools) {
          await base44.asServiceRole.entities.Tool.update(tool.id, { category: 'Övrigt' });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        totalMigrated += tools.length;
      }
    }

    return Response.json({
      success: true,
      migratedCount: totalMigrated
    });
  } catch (error) {
    console.error('Error migrating tool categories:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const oldCategories = ['0', 'ah', 'safety', 'Power_tools', 'Hand_tools'];
    
    // Get all tools
    const allTools = await base44.asServiceRole.entities.Tool.list('-updated_date', 1000);
    
    // Filter tools with old categories
    const toolsToMigrate = allTools.filter(tool => oldCategories.includes(tool.category));
    
    // Update each tool to 'Övrigt'
    const updatePromises = toolsToMigrate.map(tool =>
      base44.asServiceRole.entities.Tool.update(tool.id, {
        category: 'Övrigt'
      })
    );

    await Promise.all(updatePromises);

    return Response.json({
      success: true,
      migratedCount: toolsToMigrate.length,
      toolIds: toolsToMigrate.map(t => t.id)
    });
  } catch (error) {
    console.error('Error migrating tool categories:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
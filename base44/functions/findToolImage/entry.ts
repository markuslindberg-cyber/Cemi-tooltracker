import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tool_id } = await req.json();

    if (!tool_id) {
      return Response.json({ error: 'tool_id is required' }, { status: 400 });
    }

    // Get tool details
    const tool = await base44.entities.Tool.get(tool_id);

    if (!tool) {
      return Response.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Skip if tool already has an image
    if (tool.image_url) {
      return Response.json({ message: 'Tool already has an image', image_url: tool.image_url });
    }

    // Build search query - prioritize model number for better results
    const searchQuery = tool.model_number
      ? `${tool.model_number} ${tool.manufacturer || ''} ${tool.name || ''}`
      : [tool.name, tool.manufacturer].filter(Boolean).join(' ');

    if (!searchQuery) {
      return Response.json({ error: 'Not enough tool info to search for image' }, { status: 400 });
    }

    // Use LLM to find image URL
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the best product image URL for: ${searchQuery}. Return a URL that directly links to an image file or a product page with a clear product image. The image should be professional and relevant. Return only the URL, nothing else.`,
      add_context_from_internet: true,
    });

    const imageUrl = result.trim();

    // Validate URL format
    if (!imageUrl.startsWith('http')) {
      return Response.json({ error: 'Could not find valid image URL' }, { status: 404 });
    }

    // Save as suggested image URL for approval
    await base44.entities.Tool.update(tool_id, { suggested_image_url: imageUrl });

    return Response.json({ success: true, suggested_image_url: imageUrl });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
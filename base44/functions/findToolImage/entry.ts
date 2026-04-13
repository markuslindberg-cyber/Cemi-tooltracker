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
      prompt: `Find the best direct product image file URL for: ${searchQuery}. The URL MUST end with an image extension like .jpg, .jpeg, .png, .gif, or .webp. DO NOT return links to product pages or websites. Return ONLY the complete image URL starting with http, nothing else.`,
      add_context_from_internet: true,
    });

    let imageUrl = result.trim();

    // Validate URL format
    if (!imageUrl.startsWith('http')) {
      return Response.json({ error: 'Could not find valid image URL' }, { status: 404 });
    }

    // Check if URL is a direct image file
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
    
    // If not a direct image, try to extract image from the page
    if (!hasImageExtension && imageUrl.includes('://')) {
      try {
        const pageResponse = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageResponse.text();
        
        // Try to extract og:image meta tag
        const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
        if (ogImageMatch && ogImageMatch[1]) {
          imageUrl = ogImageMatch[1];
        } else {
          // Try to find src attribute of img tags
          const imgMatches = html.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp))["']/gi);
          if (imgMatches && imgMatches.length > 0) {
            // Get the largest/most likely product image (typically 2nd-4th img)
            const srcMatch = imgMatches[Math.min(2, imgMatches.length - 1)].match(/src=["']([^"']+)["']/i);
            if (srcMatch && srcMatch[1]) {
              imageUrl = srcMatch[1].startsWith('http') ? srcMatch[1] : new URL(srcMatch[1], imageUrl).href;
            }
          }
        }
      } catch (error) {
        console.error('Failed to extract image from page:', error);
      }
    }
    
    // Final validation
    if (!imageUrl.startsWith('http') || !imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext))) {
      return Response.json({ error: 'Could not extract valid image URL' }, { status: 404 });
    }

    // Save as suggested image URL for approval
    await base44.entities.Tool.update(tool_id, { suggested_image_url: imageUrl });

    return Response.json({ success: true, suggested_image_url: imageUrl });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
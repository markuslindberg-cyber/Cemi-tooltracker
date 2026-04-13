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

    // Step 1: Use LLM to find a Bing Images search result page for the tool
    const bingSearchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`;
    
    // Step 2: Use Firecrawl to scrape the Bing Images page and extract the first product image
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      return Response.json({ error: 'Firecrawl API key not configured' }, { status: 500 });
    }

    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: bingSearchUrl,
        extract: {
          schema: {
            type: 'object',
            properties: {
              images: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'All image URLs found on the page',
              },
            },
          },
        },
      }),
    });

    const firecrawlData = await firecrawlResponse.json();
    
    if (!firecrawlData.success || !firecrawlData.data?.images || firecrawlData.data.images.length === 0) {
      return Response.json({ error: 'Could not find images on Bing' }, { status: 404 });
    }

    // Get the first valid image URL (filter out small/placeholder images)
    let imageUrl = null;
    for (const img of firecrawlData.data.images) {
      if (img && img.startsWith('http') && (img.includes('.jpg') || img.includes('.jpeg') || img.includes('.png') || img.includes('.webp'))) {
        imageUrl = img;
        break;
      }
    }

    if (!imageUrl) {
      return Response.json({ error: 'Could not extract valid image URL' }, { status: 404 });
    }

    // Validate URL format
    if (!imageUrl.startsWith('http')) {
      return Response.json({ error: 'Could not find valid image URL' }, { status: 404 });
    }

    // Check if URL is a direct image file
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext));

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
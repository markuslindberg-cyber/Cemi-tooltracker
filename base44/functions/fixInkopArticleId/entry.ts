import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Uppdatera inköp med fel artikel_id
    await base44.entities.LokalvardInköp.update('69de36de586abc269e07ffb1', {
      artikel_id: '69de277e5aa45d46119f2176'
    });

    return Response.json({
      success: true,
      message: 'Inköp uppdaterat — artikel_id ändrad från "71617" till "69de277e5aa45d46119f2176"'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
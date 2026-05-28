import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    // Stöd både automation-payload (event, data) och manuellt anrop (request_id, checked_out_items, ...)
    const data = body.data || body;
    if (!data || !data.request_id) {
      return Response.json({ skipped: true, reason: 'No request_id' });
    }

    const request = await base44.asServiceRole.entities.LokalvardArtikelRequest.get(data.request_id).catch(() => null);
    if (!request || !request.requested_by_email) {
      return Response.json({ skipped: true, reason: 'Request not found or no email' });
    }

    const itemList = (data.checked_out_items || [])
      .map(i => `<li style="margin:4px 0;">${i.name} — ${i.scanned_quantity || i.quantity} st</li>`)
      .join('');

    const dateFormatted = new Date(data.checked_out_date || new Date()).toLocaleDateString('sv-SE');

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: request.requested_by_email,
      subject: `✅ Din begäran om lokalvårdsartiklar är utförd${request.request_number ? ` (#${request.request_number})` : ''}`,
      body: `<div style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px 20px;">
  <div style="background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
    <div style="background: #16a34a; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">✅ Begäran godkänd och uttagen</h2>
    </div>
    <div style="padding: 32px; color: #333;">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${request.requested_by_name || ''}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Din begäran om lokalvårdsartiklar har godkänts och artiklarna har plockats ut.</p>

      <table style="width:100%; border-collapse:collapse; margin:20px 0;">
        ${request.request_number ? `<tr>
          <td style="padding:10px 14px; background:#f9f9f9; font-size:13px; color:#777; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; width:42%; border-bottom:1px solid #eee;">Begäran #</td>
          <td style="padding:10px 14px; font-size:14px; color:#222; border-bottom:1px solid #eee;">${request.request_number}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 14px; background:#f9f9f9; font-size:13px; color:#777; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; width:42%; border-bottom:1px solid #eee;">Kund</td>
          <td style="padding:10px 14px; font-size:14px; color:#222; border-bottom:1px solid #eee;">${data.customer_name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; background:#f9f9f9; font-size:13px; color:#777; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; width:42%; border-bottom:1px solid #eee;">Utfört av</td>
          <td style="padding:10px 14px; font-size:14px; color:#222; border-bottom:1px solid #eee;">${data.checked_out_by_name || ''}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px; background:#f9f9f9; font-size:13px; color:#777; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; width:42%; border-bottom:1px solid #eee;">Datum</td>
          <td style="padding:10px 14px; font-size:14px; color:#222; border-bottom:1px solid #eee;">${dateFormatted}</td>
        </tr>
      </table>

      <p style="font-size:13px; font-weight:700; color:#16a34a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Uttagna artiklar</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${itemList}
      </ul>
    </div>
    <div style="text-align:center; padding:20px 32px; font-size:12px; color:#aaa; border-top:1px solid #f0f0f0;">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`
    });

    return Response.json({ success: true, sent_to: request.requested_by_email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      original_request_id,
      new_return_date,
      extension_comment
    } = await req.json();

    const originalRequest = await base44.entities.LoanRequest.get(original_request_id);

    if (!originalRequest) {
      return Response.json({ error: 'Original loan request not found' }, { status: 404 });
    }

    // Create new extension request
    const extensionRequest = await base44.entities.LoanRequest.create({
      tool_ids: originalRequest.tool_ids,
      tool_names: originalRequest.tool_names,
      tool_details: originalRequest.tool_details.map(td => ({
        ...td,
        return_date: new_return_date
      })),
      requested_by_email: user.email,
      requested_by_name: user.full_name,
      assigned_to_email: originalRequest.assigned_to_email,
      assigned_to_name: originalRequest.assigned_to_name,
      destination_location_id: originalRequest.destination_location_id,
      destination_location_name: originalRequest.destination_location_name,
      default_return_date: new_return_date,
      requester_comment: extension_comment || '',
      approver_email: originalRequest.approver_email,
      approver_name: originalRequest.approver_name,
      destination_location_manager_email: originalRequest.destination_location_manager_email,
      destination_location_manager_name: originalRequest.destination_location_manager_name,
      is_extension_request: true,
      original_request_id: original_request_id,
      status: 'pending'
    });

    // Send email to approver about extension request
    await base44.integrations.Core.SendEmail({
      to: originalRequest.approver_email,
      subject: `Förlängningsbegäran för lånade maskiner: ${originalRequest.tool_names.join(', ')}`,
      body: `Hej ${originalRequest.approver_name},\n\nEn förlängningsbegäran har inkommit för lånade maskiner:\n\nMaskiner: ${originalRequest.tool_names.join(', ')}\nNytt återlämningsdatum: ${new_return_date}\nBegärt av: ${user.full_name}\n\nKommentar: ${extension_comment || 'Ingen kommentar'}`
    });

    return Response.json({ success: true, extensionRequest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
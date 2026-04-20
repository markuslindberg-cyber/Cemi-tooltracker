import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      tool_ids,
      tool_names,
      tool_details,
      assigned_to_email,
      assigned_to_name,
      destination_location_id,
      destination_location_name,
      default_return_date,
      requester_comment,
      approver_email,
      approver_name,
      destination_location_manager_email,
      destination_location_manager_name
    } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.create({
      tool_ids,
      tool_names,
      tool_details,
      requested_by_email: user.email,
      requested_by_name: user.full_name,
      assigned_to_email,
      assigned_to_name,
      destination_location_id,
      destination_location_name,
      default_return_date,
      requester_comment: requester_comment || '',
      approver_email: approver_email || user.email,
      approver_name: approver_name || user.full_name,
      destination_location_manager_email,
      destination_location_manager_name,
      status: 'pending'
    });

    // Send email to approver
    if (approver_email) {
      await base44.integrations.Core.SendEmail({
        to: approver_email,
        subject: `Ny förfrågan om lån av maskin från ${user.full_name}`,
        body: `Hej ${approver_name},\n\nEn ny förfrågan om lån av maskin har inkommit:\n\nMaskiner: ${tool_names.join(', ')}\nBegärd av: ${user.full_name}\nSkall lånas av: ${assigned_to_name}\nDestination: ${destination_location_name}\nÅterlämningsdatum: ${default_return_date}\n\nKommentar: ${requester_comment || 'Ingen kommentar'}\n\nVänligen godkänn eller neka förfrågan i systemet.`
      });
    }

    // Send email to destination location manager
    if (destination_location_manager_email && destination_location_manager_email !== approver_email) {
      await base44.integrations.Core.SendEmail({
        to: destination_location_manager_email,
        subject: `Maskiner lånade från annan plats - ${tool_names.join(', ')}`,
        body: `Hej ${destination_location_manager_name},\n\nFöljande maskiner har lånaats från annan plats till er kontor:\n\nMaskiner: ${tool_names.join(', ')}\nLånad av: ${assigned_to_name}\nÅterlämningsdatum: ${default_return_date}\n\nKommentar: ${requester_comment || 'Ingen kommentar'}`
      });
    }

    return Response.json({ success: true, loanRequest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
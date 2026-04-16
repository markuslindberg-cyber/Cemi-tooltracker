import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      loan_request_id,
      approved,
      approver_comment
    } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.get(loan_request_id);

    if (!loanRequest) {
      return Response.json({ error: 'Loan request not found' }, { status: 404 });
    }

    const status = approved ? 'approved' : 'rejected';

    const updated = await base44.entities.LoanRequest.update(loan_request_id, {
      status,
      approval_date: new Date().toISOString(),
      approver_comment: approver_comment || ''
    });

    // Send email to requester
    const statusText = approved ? 'godkänd' : 'nekad';
    const statusSwedish = approved ? 'Godkänd' : 'Nekad';

    await base44.integrations.Core.SendEmail({
      to: loanRequest.requested_by_email,
      subject: `Din förfrågan om lån av maskin är ${statusText}`,
      body: `Hej ${loanRequest.requested_by_name},\n\nDin förfrågan om lån av ${loanRequest.tool_names.join(', ')} har ${statusText} av ${loanRequest.approver_name}.\n\nStatus: ${statusSwedish}\nKommentar: ${approver_comment || 'Ingen kommentar'}\n\nÅterlämningsdatum: ${loanRequest.default_return_date}`
    });

    // If approved, send email to destination location manager
    if (approved && loanRequest.destination_location_manager_email && loanRequest.destination_location_manager_email !== user.email) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.destination_location_manager_email,
        subject: `Godkänd: Maskiner lånade från annan plats`,
        body: `Hej ${loanRequest.destination_location_manager_name},\n\nFöljande maskiner har godkänts för lån till er kontor:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nLånad av: ${loanRequest.assigned_to_name}\nÅterlämningsdatum: ${loanRequest.default_return_date}`
      });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
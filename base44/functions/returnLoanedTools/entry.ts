import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loan_request_id } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.get(loan_request_id);

    if (!loanRequest) {
      return Response.json({ error: 'Loan request not found' }, { status: 404 });
    }

    const updated = await base44.entities.LoanRequest.update(loan_request_id, {
      status: 'returned',
      returned_date: new Date().toISOString()
    });

    // Send email to approver (source location manager)
    await base44.integrations.Core.SendEmail({
      to: loanRequest.approver_email,
      subject: `Maskiner tillbaka: ${loanRequest.tool_names.join(', ')}`,
      body: `Hej ${loanRequest.approver_name},\n\nFöljande maskiner har återlämnats:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nLånad av: ${loanRequest.assigned_to_name}\nÅterlämnad: ${new Date().toLocaleDateString('sv-SE')}`
    });

    // Send email to destination location manager
    if (loanRequest.destination_location_manager_email && loanRequest.destination_location_manager_email !== loanRequest.approver_email) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.destination_location_manager_email,
        subject: `Maskiner returnerade från lån`,
        body: `Hej ${loanRequest.destination_location_manager_name},\n\nFöljande maskiner från lån har returnerats:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nReturnerad: ${new Date().toLocaleDateString('sv-SE')}`
      });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
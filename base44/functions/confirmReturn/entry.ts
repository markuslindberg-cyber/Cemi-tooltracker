import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Ansvarig bekräftar att de tagit emot den returnerade utrustningen
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loan_request_id, comment } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.get(loan_request_id);

    if (!loanRequest) {
      return Response.json({ error: 'Loan request not found' }, { status: 404 });
    }

    if (loanRequest.status !== 'pending_return') {
      return Response.json({ error: 'Loan is not pending return confirmation' }, { status: 400 });
    }

    const updated = await base44.entities.LoanRequest.update(loan_request_id, {
      status: 'returned',
      return_confirmed_by_name: user.full_name,
      return_confirmed_date: new Date().toISOString(),
      approver_comment: comment || loanRequest.approver_comment || ''
    });

    // Notify the loanee that return is confirmed
    await base44.integrations.Core.SendEmail({
      to: loanRequest.assigned_to_email,
      subject: `Återlämning bekräftad: ${loanRequest.tool_names.join(', ')}`,
      body: `Hej ${loanRequest.assigned_to_name},\n\n${user.full_name} har bekräftat mottagning av följande maskiner:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nBekräftad: ${new Date().toLocaleDateString('sv-SE')}\n\nTack för att du lämnade tillbaka utrustningen!`
    });

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
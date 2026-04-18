import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Directly update the return date on an approved loan (no approval needed)
// Used for setting an EARLIER return date
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { loan_request_id, new_return_date, comment } = await req.json();

    const loanRequest = await base44.entities.LoanRequest.get(loan_request_id);
    if (!loanRequest) return Response.json({ error: 'Loan request not found' }, { status: 404 });

    await base44.entities.LoanRequest.update(loan_request_id, {
      default_return_date: new_return_date,
      requester_comment: comment || loanRequest.requester_comment || ''
    });

    // Notify approver about the earlier return date
    await base44.integrations.Core.SendEmail({
      to: loanRequest.approver_email,
      subject: `Ändrat återlämningsdatum: ${loanRequest.tool_names.join(', ')}`,
      body: `Hej ${loanRequest.approver_name},\n\nÅterlämningsdatumet för lånade maskiner har ändrats:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nNytt återlämningsdatum: ${new_return_date}\nÄndrat av: ${user.full_name}\n\nKommentar: ${comment || 'Ingen kommentar'}`
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Låntagaren markerar utrustning som returnerad -> status pending_return
// Ansvarig måste sedan bekräfta mottagning via confirmReturn
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
      status: 'pending_return',
      returned_date: new Date().toISOString()
    });

    // Notify the approver (source location manager) that tools are on their way back
    await base44.integrations.Core.SendEmail({
      to: loanRequest.approver_email,
      subject: `Bekräfta mottagning av maskiner: ${loanRequest.tool_names.join(', ')}`,
      body: `Hej ${loanRequest.approver_name},\n\n${loanRequest.assigned_to_name} har markerat att följande maskiner är på väg tillbaka:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nLånad av: ${loanRequest.assigned_to_name}\nÅterlämnad: ${new Date().toLocaleDateString('sv-SE')}\n\nVänligen logga in i ToolTrack och bekräfta att du har tagit emot maskinerna.`
    });

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
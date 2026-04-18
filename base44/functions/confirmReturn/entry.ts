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

    // Logga returnering och uppdatera anteckningar på varje verktyg
    const now = new Date().toISOString();
    const toolIds = loanRequest.tool_ids || [];
    await Promise.all(toolIds.map(async (toolId) => {
      // Skapa loggpost
      await base44.asServiceRole.entities.ToolLog.create({
        tool_id: toolId,
        changed_by_email: user.email,
        changed_by_name: user.full_name,
        change_date: now,
        change_type: 'updated',
        field_name: 'status',
        old_value: 'in_use',
        new_value: 'returned',
        comment: comment || ''
      });

      // Lägg till kommentar på maskinens anteckningar om kommentar finns
      if (comment) {
        const tool = await base44.asServiceRole.entities.Tool.get(toolId);
        const existingNotes = tool?.notes || '';
        const newNote = `[${dateStr} – Återlämnad av ${loanRequest.assigned_to_name}, bekräftad av ${user.full_name}]: ${comment}`;
        const updatedNotes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
        await base44.asServiceRole.entities.Tool.update(toolId, { notes: updatedNotes });
      }
    }));

    const commentRow = comment ? `\nKommentar från mottagaren: ${comment}` : '';
    const dateStr = new Date().toLocaleDateString('sv-SE');

    // Mail till låntagaren
    await base44.integrations.Core.SendEmail({
      to: loanRequest.assigned_to_email,
      subject: `Återlämning bekräftad: ${loanRequest.tool_names.join(', ')}`,
      body: `Hej ${loanRequest.assigned_to_name},\n\n${user.full_name} har bekräftat mottagning av följande maskiner:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nBekräftad: ${dateStr}${commentRow}\n\nTack för att du lämnade tillbaka utrustningen!`
    });

    // Mail till platsansvarig för destinationsplatsen
    if (loanRequest.destination_location_manager_email) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.destination_location_manager_email,
        subject: `Utrustning åter i lager: ${loanRequest.tool_names.join(', ')}`,
        body: `Hej ${loanRequest.destination_location_manager_name || ''},\n\nFöljande utrustning som lånades till ${loanRequest.destination_location_name} har nu bekräftats återsänd av ${user.full_name}:\n\nMaskiner: ${loanRequest.tool_names.join(', ')}\nLånad av: ${loanRequest.assigned_to_name}\nBekräftad: ${dateStr}${commentRow}\n\nMed vänliga hälsningar,\nToolTrack`
      });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
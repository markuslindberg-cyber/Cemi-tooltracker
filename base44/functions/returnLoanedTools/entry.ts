import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Låntagaren markerar utrustning som returnerad -> status pending_return
// Ansvarig måste sedan bekräfta mottagning via confirmReturn

const emailStyle = `font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px 20px;`;
const cardStyle = `background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);`;
const bodyStyle = `padding: 32px; color: #333;`;
const tableStyle = `width: 100%; border-collapse: collapse; margin: 20px 0;`;
const labelCellStyle = `padding: 10px 14px; background: #f9f9f9; font-size: 13px; color: #777; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 42%; border-bottom: 1px solid #eee;`;
const valueCellStyle = `padding: 10px 14px; font-size: 14px; color: #222; border-bottom: 1px solid #eee;`;
const footerStyle = `text-align: center; padding: 20px 32px; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0;`;
const alertBoxStyle = `background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #92400e;`;

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

    // Rollkontroll: tilldelad person, admin eller ägare
    const isAssigned = user.email === loanRequest.assigned_to_email;
    if (!isAssigned && !['admin', 'ägare'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Ingen behörighet att returnera dessa verktyg' }, { status: 403 });
    }

    const updated = await base44.entities.LoanRequest.update(loan_request_id, {
      status: 'pending_return',
      returned_date: new Date().toISOString()
    });

    const toolList = loanRequest.tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
    const returnedDate = new Date().toLocaleDateString('sv-SE');

    // Fetch TeamMember data to check subscriptions
    const teamMembers = await base44.entities.TeamMember.list();
    const getSubscriptionStatus = (email) => {
      const member = teamMembers.find(m => m.email === email);
      return member?.subscribed_to_emails !== false;
    };

    const buildReturnPendingEmail = (recipientName, isApprover) => `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="background: #d97706; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">⏳ ${isApprover ? 'Bekräfta mottagning av maskiner' : 'Maskiner på väg tillbaka'}</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${recipientName}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;"><strong>${loanRequest.assigned_to_name}</strong> har markerat att följande maskiner är på väg tillbaka${isApprover ? ' och väntar på din mottagningsbekräftelse' : ''}.</p>

      <p style="font-size:13px; font-weight:700; color:#d97706; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Låntagare</td>
          <td style="${valueCellStyle}">${loanRequest.assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Lånad från</td>
          <td style="${valueCellStyle}">${loanRequest.tool_details?.[0]?.location_name || '–'}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${loanRequest.destination_location_name || '–'}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Markerad returnerad</td>
          <td style="${valueCellStyle}">${returnedDate}</td>
        </tr>
      </table>

      ${isApprover ? `<div style="${alertBoxStyle}">
        <strong>Åtgärd krävs:</strong> Logga in i ToolTrack och bekräfta att du har tagit emot maskinerna under fliken <em>"Bekräfta mottagning"</em>.
      </div>` : ''}
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;

    // Collect unique recipients
    const sentTo = new Set();

    // 1. Mail till godkännaren (ansvarig för ursprungsplatsen) – med bekräftelse-uppmaning
    if (loanRequest.approver_email && getSubscriptionStatus(loanRequest.approver_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.approver_email,
        subject: `⏳ Maskiner på väg tillbaka – bekräfta mottagning`,
        body: buildReturnPendingEmail(loanRequest.approver_name, true)
      });
      sentTo.add(loanRequest.approver_email);
    }

    // 2. Kopia till destinationsplatsens ansvarige
    if (loanRequest.destination_location_manager_email && !sentTo.has(loanRequest.destination_location_manager_email) && getSubscriptionStatus(loanRequest.destination_location_manager_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.destination_location_manager_email,
        subject: `⏳ Maskiner på väg tillbaka: ${loanRequest.tool_names.join(', ')}`,
        body: buildReturnPendingEmail(loanRequest.destination_location_manager_name || '', false)
      });
      sentTo.add(loanRequest.destination_location_manager_email);
    }

    // 3. Mail till beställaren
    if (loanRequest.requested_by_email && !sentTo.has(loanRequest.requested_by_email) && loanRequest.requested_by_email !== user.email && getSubscriptionStatus(loanRequest.requested_by_email)) {
      await base44.integrations.Core.SendEmail({
        to: loanRequest.requested_by_email,
        subject: `⏳ Maskiner på väg tillbaka: ${loanRequest.tool_names.join(', ')}`,
        body: buildReturnPendingEmail(loanRequest.requested_by_name || '', false)
      });
    }

    return Response.json({ success: true, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
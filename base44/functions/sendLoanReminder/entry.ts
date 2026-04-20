import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const emailStyle = `font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px 20px;`;
const cardStyle = `background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);`;
const bodyStyle = `padding: 32px; color: #333;`;
const tableStyle = `width: 100%; border-collapse: collapse; margin: 20px 0;`;
const labelCellStyle = `padding: 10px 14px; background: #f9f9f9; font-size: 13px; color: #777; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 42%; border-bottom: 1px solid #eee;`;
const valueCellStyle = `padding: 10px 14px; font-size: 14px; color: #222; border-bottom: 1px solid #eee;`;
const footerStyle = `text-align: center; padding: 20px 32px; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0;`;

function buildReminderEmail({ recipient_name, tool_names, requester_name, assigned_to_name, destination, return_date, status, sender_name }) {
  const toolList = tool_names.map(t => `<li style="margin:4px 0;">${t}</li>`).join('');
  const statusLabels = {
    pending: 'Väntar på godkännande',
    approved: 'Godkänd',
    pending_return: 'Väntar på mottagningsbekräftelse',
    returned: 'Återlämnad',
    rejected: 'Avslagen'
  };
  const statusLabel = statusLabels[status] || status;

  return `<div style="${emailStyle}">
  <div style="${cardStyle}">
    <div style="background: #b45309; padding: 28px 32px; text-align: center;">
      <h2 style="margin:0; color:#fff; font-size:20px;">🔔 Påminnelse – Låneförfrågan</h2>
    </div>
    <div style="${bodyStyle}">
      <p style="margin:0 0 8px; font-size:15px;">Hej <strong>${recipient_name}</strong>,</p>
      <p style="margin:0 0 20px; color:#555; font-size:14px;">Detta är en påminnelse om en aktiv låneförfrågan. Skickad av <strong>${sender_name}</strong>.</p>

      <p style="font-size:13px; font-weight:700; color:#8B1E1E; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Maskiner</p>
      <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:#333; line-height:1.7;">
        ${toolList}
      </ul>

      <table style="${tableStyle}">
        <tr>
          <td style="${labelCellStyle}">Begärd av</td>
          <td style="${valueCellStyle}">${requester_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Ska lånas av</td>
          <td style="${valueCellStyle}">${assigned_to_name}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Destination</td>
          <td style="${valueCellStyle}">${destination}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Återlämning</td>
          <td style="${valueCellStyle}">${new Date(return_date).toLocaleDateString('sv-SE')}</td>
        </tr>
        <tr>
          <td style="${labelCellStyle}">Status</td>
          <td style="${valueCellStyle}"><strong>${statusLabel}</strong></td>
        </tr>
      </table>

      <p style="font-size:13px; color:#888; margin-top:24px;">Logga in i ToolTrack för att hantera förfrågan.</p>
    </div>
    <div style="${footerStyle}">ToolTrack – Automatiskt genererat meddelande</div>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { loan_request_id } = await req.json();
    if (!loan_request_id) return Response.json({ error: 'loan_request_id krävs' }, { status: 400 });

    const loan = await base44.entities.LoanRequest.get(loan_request_id);
    if (!loan) return Response.json({ error: 'Låneförfrågan hittades inte' }, { status: 404 });

    const emailData = {
      tool_names: loan.tool_names || [],
      requester_name: loan.requested_by_name || '—',
      assigned_to_name: loan.assigned_to_name || '—',
      destination: loan.destination_location_name || '—',
      return_date: loan.default_return_date,
      status: loan.status,
      sender_name: user.full_name
    };

    const recipients = [];

    // Always send to approver if status is pending
    if (loan.approver_email) {
      recipients.push({ email: loan.approver_email, name: loan.approver_name || loan.approver_email });
    }

    // Also send to assigned person if approved
    if (loan.assigned_to_email && loan.assigned_to_email !== loan.approver_email) {
      recipients.push({ email: loan.assigned_to_email, name: loan.assigned_to_name || loan.assigned_to_email });
    }

    for (const r of recipients) {
      await base44.integrations.Core.SendEmail({
        to: r.email,
        subject: `Påminnelse: Låneförfrågan – ${(loan.tool_names || []).join(', ')}`,
        body: buildReminderEmail({ ...emailData, recipient_name: r.name })
      });
    }

    return Response.json({ success: true, sent_to: recipients.map(r => r.email) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
/**
 * Email templates as HTML strings.
 * Each function returns a complete HTML email document.
 * Styled with inline CSS for maximum email client compatibility.
 */

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000"
const BRAND_NAVY = "#0D1B2A"
const BRAND_GOLD = "#C9A84C"

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Doda Legal Practitioners</title>
</head>
<body style="margin:0;padding:0;background:#F8F9FA;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_NAVY};padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                DODA<span style="color:${BRAND_GOLD};">.</span>
              </h1>
              <p style="margin:2px 0 0;color:#9CA3AF;font-size:11px;text-transform:uppercase;letter-spacing:1px;">
                Legal Practitioners
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;">
              ${content}
              <!-- Footer -->
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0 24px;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                Doda Legal Practitioners &nbsp;&bull;&nbsp; 
                <a href="mailto:dodalegalpractitioners@gmail.com" style="color:${BRAND_GOLD};text-decoration:none;">
                  dodalegalpractitioners@gmail.com
                </a> &nbsp;&bull;&nbsp;
                <a href="tel:09028629933" style="color:${BRAND_GOLD};text-decoration:none;">09028629933</a>
              </p>
              <p style="margin:8px 0 0;color:#D1D5DB;font-size:11px;text-align:center;">
                &copy; ${new Date().getFullYear()} Doda Legal Practitioners. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_GOLD};color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 28px;border-radius:8px;margin-top:8px;">${text}</a>`
}

// ── Template functions ────────────────────────────────────────────────────────

export function leadConfirmationHtml({ name }: { name: string }): string {
  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 8px;">We received your enquiry</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">Thank you for reaching out to Doda Legal Practitioners.</p>
    
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Thank you for submitting your enquiry. We've received your details and a member of our team 
      will review it and be in touch within <strong>one business day</strong>.
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      If your matter is urgent, please don't hesitate to call us directly.
    </p>

    <div style="background:#F8F9FA;border-left:4px solid ${BRAND_GOLD};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0;color:#374151;font-size:14px;font-weight:600;">Oladoyin Odetunde</p>
      <p style="margin:4px 0 0;color:#6B7280;font-size:13px;">Principal, Doda Legal Practitioners</p>
      <p style="margin:4px 0 0;color:#6B7280;font-size:13px;">📞 09028629933</p>
    </div>

    ${btn("View Our Services", `${BASE_URL}/services`)}
  `)
}

export function newLeadAdminHtml(lead: {
  fullName: string
  email: string
  phone: string
  companyName?: string
  businessType?: string
  serviceInterest?: string[]
  engagementType?: string
  description: string
}): string {
  const row = (label: string, value?: string | null) =>
    value
      ? `<tr><td style="color:#6B7280;font-size:13px;padding:6px 12px 6px 0;font-weight:600;width:40%;">${label}</td><td style="color:#374151;font-size:13px;padding:6px 0;">${value}</td></tr>`
      : ""

  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 4px;">🔔 New Lead Received</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">A new enquiry has been submitted via the website.</p>

    <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <tr style="background:#F8F9FA;">
        <td colspan="2" style="padding:12px 16px;font-weight:700;color:${BRAND_NAVY};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
          Enquirer Details
        </td>
      </tr>
      <tr style="background:#ffffff;">
        <td colspan="2" style="padding:12px 16px;">
          <table cellpadding="0" cellspacing="0" width="100%">
            ${row("Full Name", lead.fullName)}
            ${row("Email", lead.email)}
            ${row("Phone", lead.phone)}
            ${row("Company", lead.companyName)}
            ${row("Business Type", lead.businessType)}
            ${row("Engagement Type", lead.engagementType)}
            ${row("Services Interested", lead.serviceInterest?.join(", "))}
          </table>
        </td>
      </tr>
      <tr style="background:#F8F9FA;">
        <td colspan="2" style="padding:12px 16px;font-weight:700;color:${BRAND_NAVY};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
          Description
        </td>
      </tr>
      <tr style="background:#ffffff;">
        <td colspan="2" style="padding:12px 16px;color:#374151;font-size:14px;line-height:1.6;">
          ${lead.description}
        </td>
      </tr>
    </table>

    ${btn("View in Admin Dashboard", `${BASE_URL}/admin/leads`)}
  `)
}

export function welcomeClientHtml({
  name,
  email,
  tempPassword,
}: {
  name: string
  email: string
  tempPassword: string
}): string {
  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 8px;">Welcome to Doda — your client portal is ready</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">We're excited to begin working with you.</p>
    
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Your Doda client portal account has been set up. You can now log in to view your matters,
      documents, invoices, and communicate with our team.
    </p>

    <div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">Your login credentials:</p>
      <p style="margin:0 0 4px;color:#6B7280;font-size:13px;">Email: <strong style="color:${BRAND_NAVY};">${email}</strong></p>
      <p style="margin:0;color:#6B7280;font-size:13px;">Temporary Password: <strong style="color:${BRAND_NAVY};">${tempPassword}</strong></p>
      <p style="margin:12px 0 0;color:#EF4444;font-size:12px;font-weight:600;">⚠️ Please change your password immediately after first login.</p>
    </div>

    ${btn("Access Your Portal", `${BASE_URL}/dashboard`)}
  `)
}

export function matterUpdateHtml({
  clientName,
  matterTitle,
  updateMessage,
  matterUrl,
}: {
  clientName: string
  matterTitle: string
  updateMessage: string
  matterUrl: string
}): string {
  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 8px;">Update on your matter</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">${matterTitle}</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      We have an update on your matter: <strong>${matterTitle}</strong>
    </p>
    
    <div style="background:#F8F9FA;border-left:4px solid ${BRAND_GOLD};padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${updateMessage}</p>
    </div>

    ${btn("View Your Matter", matterUrl)}
  `)
}

export function invoiceIssuedHtml({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  invoiceUrl,
}: {
  clientName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  invoiceUrl: string
}): string {
  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 8px;">Invoice ${invoiceNumber}</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">A new invoice has been issued to your account.</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Please find attached invoice <strong>${invoiceNumber}</strong> for legal services rendered.
    </p>

    <div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin:24px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#6B7280;font-size:13px;padding:4px 0;font-weight:600;">Invoice Number</td>
          <td style="color:#374151;font-size:13px;text-align:right;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="color:#6B7280;font-size:13px;padding:4px 0;font-weight:600;">Amount Due</td>
          <td style="color:${BRAND_NAVY};font-size:16px;font-weight:700;text-align:right;">${amount}</td>
        </tr>
        <tr>
          <td style="color:#6B7280;font-size:13px;padding:4px 0;font-weight:600;">Due Date</td>
          <td style="color:#EF4444;font-size:13px;font-weight:600;text-align:right;">${dueDate}</td>
        </tr>
      </table>
    </div>

    ${btn("View & Pay Invoice", invoiceUrl)}
  `)
}

export function invoiceReceiptHtml({
  clientName,
  invoiceNumber,
  amount,
  paidDate,
}: {
  clientName: string
  invoiceNumber: string
  amount: string
  paidDate: string
}): string {
  return layout(`
    <h2 style="color:#16A34A;font-size:20px;margin:0 0 8px;">✅ Payment Received</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">Invoice ${invoiceNumber} — Paid in Full</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      We've received your payment of <strong>${amount}</strong> for invoice <strong>${invoiceNumber}</strong>. 
      Thank you — this serves as your receipt.
    </p>

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:20px;margin:24px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#166534;font-size:13px;padding:4px 0;font-weight:600;">Invoice</td>
          <td style="color:#166534;font-size:13px;text-align:right;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:13px;padding:4px 0;font-weight:600;">Amount Paid</td>
          <td style="color:#166534;font-size:16px;font-weight:700;text-align:right;">${amount}</td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:13px;padding:4px 0;font-weight:600;">Payment Date</td>
          <td style="color:#166534;font-size:13px;text-align:right;">${paidDate}</td>
        </tr>
      </table>
    </div>

    ${btn("View Your Portal", `${BASE_URL}/dashboard/billing`)}
  `)
}

export function invoiceReminderHtml({
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  daysOverdue,
  invoiceUrl,
}: {
  clientName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  daysOverdue: number
  invoiceUrl: string
}): string {
  const isOverdue = daysOverdue > 0
  return layout(`
    <h2 style="color:${isOverdue ? "#EF4444" : BRAND_NAVY};font-size:20px;margin:0 0 8px;">
      ${isOverdue ? "⚠️ Invoice Overdue" : "Invoice Payment Reminder"}
    </h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">Invoice ${invoiceNumber}</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      ${isOverdue
        ? `Invoice <strong>${invoiceNumber}</strong> is now <strong style="color:#EF4444;">${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>. Please arrange payment at your earliest convenience.`
        : `This is a reminder that invoice <strong>${invoiceNumber}</strong> is due on <strong>${dueDate}</strong>.`
      }
    </p>

    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 4px;color:#991B1B;font-size:13px;font-weight:600;">Amount Due: ${amount}</p>
      <p style="margin:0;color:#991B1B;font-size:13px;">Due Date: ${dueDate}</p>
    </div>

    ${btn("Pay Invoice Now", invoiceUrl)}
  `)
}

export function retainerRenewalHtml({
  clientName,
  planName,
  renewalDate,
  amount,
  portalUrl,
}: {
  clientName: string
  planName: string
  renewalDate: string
  amount: string
  portalUrl: string
}): string {
  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 8px;">Retainer Renewal Notice</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">${planName}</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${clientName},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Your <strong>${planName}</strong> retainer is due for renewal on <strong>${renewalDate}</strong>.
      We value our partnership and look forward to continuing to support your business.
    </p>

    <div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600;">Plan: ${planName}</p>
      <p style="margin:0 0 4px;color:#374151;font-size:13px;">Monthly Fee: <strong>${amount}</strong></p>
      <p style="margin:0;color:#374151;font-size:13px;">Renewal Date: <strong>${renewalDate}</strong></p>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.6;">
      If you wish to discuss your retainer terms or upgrade your plan, please reach out to us before the renewal date.
    </p>

    ${btn("View Your Portal", portalUrl)}
  `)
}

export function passwordResetHtml({
  name,
  resetUrl,
}: {
  name: string
  resetUrl: string
}): string {
  return layout(`
    <h2 style="color:${BRAND_NAVY};font-size:20px;margin:0 0 8px;">Reset Your Password</h2>
    <p style="color:#6B7280;font-size:14px;margin:0 0 24px;">We received a request to reset your password.</p>

    <p style="color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Click the button below to reset your password. This link will expire in <strong>1 hour</strong>.
    </p>

    ${btn("Reset Password", resetUrl)}

    <p style="color:#6B7280;font-size:13px;margin-top:24px;line-height:1.5;">
      If you didn't request a password reset, you can safely ignore this email. 
      Your password will not be changed.
    </p>
    <p style="color:#D1D5DB;font-size:12px;margin-top:8px;word-break:break-all;">
      If the button doesn't work, copy and paste this URL: ${resetUrl}
    </p>
  `)
}

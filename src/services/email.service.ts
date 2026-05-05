import { Resend } from "resend"
import {
  leadConfirmationHtml,
  newLeadAdminHtml,
  welcomeClientHtml,
  matterUpdateHtml,
  invoiceIssuedHtml,
  invoiceReceiptHtml,
  invoiceReminderHtml,
  retainerRenewalHtml,
  passwordResetHtml,
} from "../emails/templates"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM    = process.env.EMAIL_FROM     || "noreply@dodalegal.ng"
const REPLY_TO = process.env.EMAIL_REPLY_TO || "dodalegalpractitioners@gmail.com"
const ADMIN   = process.env.ADMIN_EMAIL    || "dodalegalpractitioners@gmail.com"

async function send({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not set — skipping email to:", to)
    return
  }
  try {
    await resend.emails.send({ from: FROM, replyTo: REPLY_TO, to, subject, html })
  } catch (err) {
    console.error("[EMAIL] Failed to send email:", err)
    throw err
  }
}

export const emailService = {
  // ── Lead emails ────────────────────────────────────────────────────────────
  async sendLeadConfirmation({ to, name }: { to: string; name: string }) {
    await send({
      to,
      subject: "We received your enquiry — Doda Legal Practitioners",
      html:    leadConfirmationHtml({ name }),
    })
  },

  async sendNewLeadAdmin({
    lead,
  }: {
    lead: {
      fullName: string
      email: string
      phone: string
      companyName?: string
      businessType?: string
      serviceInterest?: string[]
      engagementType?: string
      description: string
    }
  }) {
    await send({
      to:      ADMIN,
      subject: `🔔 New Lead: ${lead.fullName} — ${lead.businessType || "Enquiry"}`,
      html:    newLeadAdminHtml(lead),
    })
  },

  // ── Client onboarding ──────────────────────────────────────────────────────
  async sendWelcomeClient({
    to,
    name,
    email,
    tempPassword,
  }: {
    to: string
    name: string
    email: string
    tempPassword: string
  }) {
    await send({
      to,
      subject: "Welcome to Doda — your client portal is ready",
      html:    welcomeClientHtml({ name, email, tempPassword }),
    })
  },

  // ── Matter emails ──────────────────────────────────────────────────────────
  async sendMatterUpdate({
    to,
    clientName,
    matterTitle,
    updateMessage,
    matterUrl,
  }: {
    to: string
    clientName: string
    matterTitle: string
    updateMessage: string
    matterUrl: string
  }) {
    await send({
      to,
      subject: `Update on your matter: ${matterTitle}`,
      html:    matterUpdateHtml({ clientName, matterTitle, updateMessage, matterUrl }),
    })
  },

  // ── Invoice emails ─────────────────────────────────────────────────────────
  async sendInvoiceIssued({
    to,
    clientName,
    invoiceNumber,
    amount,
    dueDate,
    invoiceUrl,
  }: {
    to: string
    clientName: string
    invoiceNumber: string
    amount: string
    dueDate: string
    invoiceUrl: string
  }) {
    await send({
      to,
      subject: `Invoice ${invoiceNumber} — Doda Legal Practitioners`,
      html:    invoiceIssuedHtml({ clientName, invoiceNumber, amount, dueDate, invoiceUrl }),
    })
  },

  async sendInvoiceReceipt({
    to,
    clientName,
    invoiceNumber,
    amount,
    paidDate,
  }: {
    to: string
    clientName: string
    invoiceNumber: string
    amount: string
    paidDate: string
  }) {
    await send({
      to,
      subject: `Payment received — Invoice ${invoiceNumber}`,
      html:    invoiceReceiptHtml({ clientName, invoiceNumber, amount, paidDate }),
    })
  },

  async sendInvoiceReminder({
    to,
    clientName,
    invoiceNumber,
    amount,
    dueDate,
    daysOverdue,
    invoiceUrl,
  }: {
    to: string
    clientName: string
    invoiceNumber: string
    amount: string
    dueDate: string
    daysOverdue: number
    invoiceUrl: string
  }) {
    const subject = daysOverdue > 0
      ? `⚠️ Invoice ${invoiceNumber} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`
      : `Reminder: Invoice ${invoiceNumber} is due soon`
    await send({
      to,
      subject,
      html: invoiceReminderHtml({ clientName, invoiceNumber, amount, dueDate, daysOverdue, invoiceUrl }),
    })
  },

  // ── Retainer emails ────────────────────────────────────────────────────────
  async sendRetainerRenewal({
    to,
    clientName,
    planName,
    renewalDate,
    amount,
    portalUrl,
  }: {
    to: string
    clientName: string
    planName: string
    renewalDate: string
    amount: string
    portalUrl: string
  }) {
    await send({
      to,
      subject: `Retainer renewal notice — ${planName}`,
      html:    retainerRenewalHtml({ clientName, planName, renewalDate, amount, portalUrl }),
    })
  },

  // ── Auth emails ────────────────────────────────────────────────────────────
  async sendPasswordReset({
    to,
    name,
    resetUrl,
  }: {
    to: string
    name: string
    resetUrl: string
  }) {
    await send({
      to,
      subject: "Reset your Doda password",
      html:    passwordResetHtml({ name, resetUrl }),
    })
  },
}

/**
 * reminders.job.ts — Doda Legal Practitioners
 *
 * Automated background jobs using node-cron.
 * All jobs run server-side and are started once the DB connection is established.
 *
 * Jobs:
 *  1. Invoice due-soon reminder  — daily 08:00 WAT — invoices due in exactly 3 days
 *  2. Invoice overdue checker    — daily 08:30 WAT — mark sent invoices past dueDate as
 *                                  overdue, send overdue notice emails
 *  3. Retainer renewal reminder  — daily 09:00 WAT — retainers renewing in 7 days
 *  4. Matter action-required     — daily 09:30 WAT — matters in pending_client status,
 *                                  notify the client via in-app notification + email
 */

import cron from "node-cron"
import { Invoice }      from "../models/Invoice.model"
import { Retainer }     from "../models/Retainer.model"
import { Matter }       from "../models/Matter.model"
import { Client }       from "../models/Client.model"
import { Notification } from "../models/Notification.model"
import { User }         from "../models/User.model"
import { emailService } from "../services/email.service"

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return the start-of-day and end-of-day for a date that is `daysFromNow` in
 *  the future, in UTC. */
function dayWindow(daysFromNow: number): { start: Date; end: Date } {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + daysFromNow)
  const start = new Date(d)
  const end   = new Date(d)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

/** Create an in-app notification for a user. Fire-and-forget — errors are logged
 *  but never thrown (we don't want a notification failure to kill the job). */
async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string
) {
  try {
    await Notification.create({ userId, type, title, body, link, isRead: false })
  } catch (err) {
    console.error(`[NOTIFY] Failed to create notification for user ${userId}:`, err)
  }
}

// ── Job 1 — Invoice due-soon reminder ─────────────────────────────────────────
//   Runs at 08:00 every day.
//   Finds all invoices with status="sent" where dueDate falls within the next 3 days.
//   Sends a reminder email to the client and creates an in-app notification.

async function runInvoiceDueSoonReminders() {
  const TAG = "[JOB:invoice-due-soon]"
  console.log(`${TAG} Starting…`)

  try {
    const { start, end } = dayWindow(3)

    const invoices = await Invoice.find({
      status:  "sent",
      dueDate: { $gte: start, $lte: end },
    }).populate("clientId", "companyName individualName primaryEmail userId")

    console.log(`${TAG} Found ${invoices.length} invoice(s) due in 3 days`)

    for (const invoice of invoices) {
      const client = (invoice.clientId as unknown) as {
        companyName?: string
        individualName?: string
        primaryEmail: string
        userId?: string
      } | null

      if (!client?.primaryEmail) continue

      const clientName = client.companyName || client.individualName || "Valued Client"
      const dueDate    = invoice.dueDate!.toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })

      // Send reminder email
      await emailService.sendInvoiceReminder({
        to:          client.primaryEmail,
        clientName,
        invoiceNumber: invoice.invoiceNumber,
        amount:      `₦${invoice.total.toLocaleString()}`,
        dueDate,
        daysOverdue: -3, // negative = still in the future
        invoiceUrl:  `${process.env.FRONTEND_URL}/dashboard/billing`,
      }).catch(err => console.error(`${TAG} Email failed for invoice ${invoice.invoiceNumber}:`, err))

      // In-app notification (requires client's userId)
      if (client.userId) {
        await notify(
          String(client.userId),
          "invoice_due_soon",
          `Invoice ${invoice.invoiceNumber} is due soon`,
          `Your invoice of ₦${invoice.total.toLocaleString()} is due on ${dueDate}. Please settle it before the deadline.`,
          "/dashboard/billing"
        )
      }

      console.log(`${TAG} Reminder sent for invoice ${invoice.invoiceNumber} → ${client.primaryEmail}`)
    }
  } catch (err) {
    console.error(`${TAG} Unhandled error:`, err)
  }
}

// ── Job 2 — Invoice overdue checker ───────────────────────────────────────────
//   Runs at 08:30 every day.
//   Finds all invoices with status="sent" where dueDate is before today.
//   1. Updates status → "overdue"
//   2. Sends overdue notice email to client
//   3. Creates in-app notification for client

async function runInvoiceOverdueChecker() {
  const TAG = "[JOB:invoice-overdue]"
  console.log(`${TAG} Starting…`)

  try {
    const now = new Date()

    const invoices = await Invoice.find({
      status:  "sent",
      dueDate: { $lt: now },
    }).populate("clientId", "companyName individualName primaryEmail userId")

    console.log(`${TAG} Found ${invoices.length} overdue invoice(s)`)

    for (const invoice of invoices) {
      const client = (invoice.clientId as unknown) as {
        companyName?: string
        individualName?: string
        primaryEmail: string
        userId?: string
      } | null

      // Mark as overdue
      await Invoice.findByIdAndUpdate(invoice._id, { status: "overdue" })

      if (!client?.primaryEmail) continue

      const clientName = client.companyName || client.individualName || "Valued Client"
      const dueDate    = invoice.dueDate!.toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })
      const daysOverdue = Math.floor(
        (now.getTime() - invoice.dueDate!.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Send overdue email
      await emailService.sendInvoiceReminder({
        to:          client.primaryEmail,
        clientName,
        invoiceNumber: invoice.invoiceNumber,
        amount:      `₦${invoice.total.toLocaleString()}`,
        dueDate,
        daysOverdue,
        invoiceUrl:  `${process.env.FRONTEND_URL}/dashboard/billing`,
      }).catch(err => console.error(`${TAG} Email failed for invoice ${invoice.invoiceNumber}:`, err))

      // In-app notification
      if (client.userId) {
        await notify(
          String(client.userId),
          "invoice_overdue",
          `Invoice ${invoice.invoiceNumber} is overdue`,
          `Your invoice of ₦${invoice.total.toLocaleString()} was due on ${dueDate} and is now ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue. Please pay at your earliest convenience.`,
          "/dashboard/billing"
        )
      }

      console.log(`${TAG} Marked overdue + notified: invoice ${invoice.invoiceNumber} (${daysOverdue}d overdue)`)
    }
  } catch (err) {
    console.error(`${TAG} Unhandled error:`, err)
  }
}

// ── Job 3 — Retainer renewal reminder ─────────────────────────────────────────
//   Runs at 09:00 every day.
//   Finds all active retainers with renewalDate in exactly 7 days.
//   Sends a renewal notice email to the client.

async function runRetainerRenewalReminders() {
  const TAG = "[JOB:retainer-renewal]"
  console.log(`${TAG} Starting…`)

  try {
    const { start, end } = dayWindow(7)

    const retainers = await Retainer.find({
      status:      "active",
      renewalDate: { $gte: start, $lte: end },
    }).populate("clientId", "companyName individualName primaryEmail userId")

    console.log(`${TAG} Found ${retainers.length} retainer(s) renewing in 7 days`)

    for (const retainer of retainers) {
      const client = (retainer.clientId as unknown) as {
        companyName?: string
        individualName?: string
        primaryEmail: string
        userId?: string
      } | null

      if (!client?.primaryEmail) continue

      const clientName  = client.companyName || client.individualName || "Valued Client"
      const renewalDate = retainer.renewalDate.toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      })

      // Send renewal notice email
      await emailService.sendRetainerRenewal({
        to:          client.primaryEmail,
        clientName,
        planName:    retainer.planName,
        renewalDate,
        amount:      `₦${retainer.monthlyFee.toLocaleString()}`,
        portalUrl:   `${process.env.FRONTEND_URL}/dashboard/retainer`,
      }).catch(err => console.error(`${TAG} Email failed for retainer ${retainer._id}:`, err))

      // In-app notification
      if (client.userId) {
        await notify(
          String(client.userId),
          "retainer_renewal",
          `Your retainer plan renews in 7 days`,
          `Your ${retainer.planName} plan (₦${retainer.monthlyFee.toLocaleString()}/month) renews on ${renewalDate}.`,
          "/dashboard/retainer"
        )
      }

      console.log(`${TAG} Renewal reminder sent for retainer ${retainer._id} → ${client.primaryEmail}`)
    }
  } catch (err) {
    console.error(`${TAG} Unhandled error:`, err)
  }
}

// ── Job 4 — Matter action-required reminder ────────────────────────────────────
//   Runs at 09:30 every day.
//   Finds all active matters with status="pending_client".
//   Creates an in-app notification for the client (avoids spamming email daily —
//   we only send email if the matter has been in pending_client for ≥1 day).

async function runMatterActionRequiredReminders() {
  const TAG = "[JOB:matter-action-required]"
  console.log(`${TAG} Starting…`)

  try {
    // Find matters that have been pending_client for at least 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const matters = await Matter.find({
      status:    "pending_client",
      updatedAt: { $lte: cutoff },
    }).populate("clientId", "companyName individualName primaryEmail userId")

    console.log(`${TAG} Found ${matters.length} matter(s) awaiting client input`)

    for (const matter of matters) {
      const client = (matter.clientId as unknown) as {
        companyName?: string
        individualName?: string
        primaryEmail: string
        userId?: string
      } | null

      if (!client?.userId) continue

      const clientName = client.companyName || client.individualName || "Valued Client"

      // Avoid duplicate notifications: check if we already sent one today
      const startOfToday = new Date()
      startOfToday.setUTCHours(0, 0, 0, 0)

      const existing = await Notification.findOne({
        userId:    client.userId,
        type:      "matter_action_required",
        link:      `/dashboard/matters/${matter._id}`,
        createdAt: { $gte: startOfToday },
      })

      if (existing) {
        console.log(`${TAG} Skipping ${matter.title} — notification already sent today`)
        continue
      }

      // In-app notification
      await notify(
        String(client.userId),
        "matter_action_required",
        `Action required: ${matter.title}`,
        `Your matter "${matter.title}" is awaiting your input. Please log in to review and respond.`,
        `/dashboard/matters/${matter._id}`
      )

      // Email — only for matters pending > 3 days to reduce noise
      const daysPending = Math.floor(
        (Date.now() - matter.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysPending >= 3 && client.primaryEmail) {
        await emailService.sendMatterUpdate({
          to:            client.primaryEmail,
          clientName,
          matterTitle:   matter.title,
          updateMessage: `Your matter "${matter.title}" has been awaiting your input for ${daysPending} days. Please log in to your client portal to review the next steps and take action.`,
          matterUrl:     `${process.env.FRONTEND_URL}/dashboard/matters/${matter._id}`,
        }).catch(err => console.error(`${TAG} Email failed for matter ${matter._id}:`, err))
      }

      console.log(`${TAG} Action-required reminder sent: matter "${matter.title}" (pending ${daysPending}d)`)
    }
  } catch (err) {
    console.error(`${TAG} Unhandled error:`, err)
  }
}

// ── startReminderJobs ──────────────────────────────────────────────────────────
//   Called once from index.ts after the DB connection is established.
//   All times in UTC. Nigeria is UTC+1, so:
//     08:00 WAT = 07:00 UTC
//     08:30 WAT = 07:30 UTC
//     09:00 WAT = 08:00 UTC
//     09:30 WAT = 08:30 UTC

export function startReminderJobs() {
  console.log("[JOBS] Starting automated reminder jobs…")

  // ── Job 1: Invoice due-soon reminder — 07:00 UTC daily (08:00 WAT)
  cron.schedule("0 7 * * *", runInvoiceDueSoonReminders, {
    timezone: "UTC",
  })
  console.log("[JOBS] ✅ Invoice due-soon reminder — daily at 08:00 WAT")

  // ── Job 2: Invoice overdue checker — 07:30 UTC daily (08:30 WAT)
  cron.schedule("30 7 * * *", runInvoiceOverdueChecker, {
    timezone: "UTC",
  })
  console.log("[JOBS] ✅ Invoice overdue checker   — daily at 08:30 WAT")

  // ── Job 3: Retainer renewal reminder — 08:00 UTC daily (09:00 WAT)
  cron.schedule("0 8 * * *", runRetainerRenewalReminders, {
    timezone: "UTC",
  })
  console.log("[JOBS] ✅ Retainer renewal reminder — daily at 09:00 WAT")

  // ── Job 4: Matter action-required reminder — 08:30 UTC daily (09:30 WAT)
  cron.schedule("30 8 * * *", runMatterActionRequiredReminders, {
    timezone: "UTC",
  })
  console.log("[JOBS] ✅ Matter action-required    — daily at 09:30 WAT")

  console.log("[JOBS] All reminder jobs registered.")
}

// ── Manual trigger exports (for admin API or testing) ─────────────────────────
export const reminderJobs = {
  invoiceDueSoon:    runInvoiceDueSoonReminders,
  invoiceOverdue:    runInvoiceOverdueChecker,
  retainerRenewal:   runRetainerRenewalReminders,
  matterActionRequired: runMatterActionRequiredReminders,
}

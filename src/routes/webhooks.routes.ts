import { Router } from "express"
import crypto from "crypto"
import { Invoice } from "../models/Invoice.model"
import { Client } from "../models/Client.model"
import { emailService } from "../services/email.service"

const router = Router()

// POST /api/webhooks/paystack
// Note: raw body parsing for this route is set in app.ts BEFORE express.json()
router.post("/paystack", async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"] as string
    const body = req.body as Buffer // raw buffer

    if (!process.env.PAYSTACK_WEBHOOK_SECRET) {
      console.warn("[WEBHOOK] PAYSTACK_WEBHOOK_SECRET not set — skipping verification")
    } else {
      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
        .update(body)
        .digest("hex")
      if (hash !== signature) {
        return res.status(400).json({ error: "Invalid signature" })
      }
    }

    const event = JSON.parse(body.toString()) as {
      event: string
      data: {
        amount: number
        metadata?: { invoiceId?: string }
        reference?: string
      }
    }

    if (event.event === "charge.success") {
      const invoiceId = event.data.metadata?.invoiceId
      if (!invoiceId) {
        console.warn("[WEBHOOK] charge.success without invoiceId in metadata")
        return res.json({ received: true })
      }

      const invoice = await Invoice.findByIdAndUpdate(
        invoiceId,
        {
          status: "paid",
          paidDate: new Date(),
          paidAmount: event.data.amount / 100,
          paymentMethod: "card",
        },
        { new: true }
      )

      if (invoice) {
        const client = await Client.findById(invoice.clientId)
        if (client?.primaryEmail) {
          await emailService.sendInvoiceReceipt({
            to: client.primaryEmail,
            clientName: client.companyName || client.individualName || "Valued Client",
            invoiceNumber: invoice.invoiceNumber,
            amount: `₦${invoice.total.toLocaleString()}`,
            paidDate: new Date().toLocaleDateString("en-GB"),
          }).catch((err) => console.error("[WEBHOOK] Failed to send receipt email:", err))
        }
      }
    }

    return res.json({ received: true })
  } catch (err) {
    console.error("[WEBHOOK] Error:", err)
    return res.status(500).json({ error: "Webhook handler error" })
  }
})

export default router

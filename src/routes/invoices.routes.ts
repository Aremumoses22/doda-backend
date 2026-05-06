import { Router } from "express"
import multer from "multer"
import path from "path"
import { Invoice } from "../models/Invoice.model"
import { Client } from "../models/Client.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"
import { emailService } from "../services/email.service"
import { uploadDocument } from "../services/storage.service"

// Multer for payment proof uploads (temporary disk storage)
const proofUpload = multer({
  dest: "/tmp/payment-proofs/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png"]
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error("Only PDF and image files are accepted"))
  },
})

const router = Router()
const billingRoles = ["principal", "billing_admin", "lawyer"] as const

// GET /api/invoices
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>
    const filter: Record<string, unknown> = {}

    if (req.user!.role === "client") {
      // Clients only see their own invoices
      const client = await Client.findOne({ userId: req.user!.id }).select("_id").lean()
      if (!client) return res.json({ invoices: [], total: 0, page: 1, limit: parseInt(limit) })
      filter.clientId = client._id
    } else {
      const allowedRoles = [...billingRoles, "admin_staff"] as string[]
      if (!allowedRoles.includes(req.user!.role)) {
        return res.status(403).json({ error: "Access denied" })
      }
      const { clientId } = req.query as Record<string, string>
      if (clientId) filter.clientId = clientId
    }

    if (status) filter.status = status
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("clientId", "companyName individualName clientCode")
        .populate("matterId", "title matterCode"),
      Invoice.countDocuments(filter),
    ])
    return res.json({ invoices, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch invoices" })
  }
})

// GET /api/invoices/:id
router.get("/:id", requireAuth, requireRole(...billingRoles, "admin_staff"), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("clientId", "companyName individualName primaryEmail clientCode")
      .populate("matterId", "title matterCode")
    if (!invoice) return res.status(404).json({ error: "Invoice not found" })
    return res.json(invoice)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch invoice" })
  }
})

// POST /api/invoices
router.post("/", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    let { invoiceNumber } = req.body
    if (!invoiceNumber) {
      const year = new Date().getFullYear()
      const count = await Invoice.countDocuments()
      invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`
      let exists = await Invoice.findOne({ invoiceNumber })
      let i = count + 2
      while (exists) {
        invoiceNumber = `INV-${year}-${String(i).padStart(4, "0")}`
        exists = await Invoice.findOne({ invoiceNumber })
        i++
      }
    }
    const invoice = await Invoice.create({ ...req.body, invoiceNumber, createdById: req.user!.id })
    return res.status(201).json(invoice)
  } catch (err) {
    console.error("[INVOICES] POST /:", err)
    return res.status(500).json({ error: "Failed to create invoice" })
  }
})

// PATCH /api/invoices/:id
router.patch("/:id", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!invoice) return res.status(404).json({ error: "Invoice not found" })
    return res.json(invoice)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update invoice" })
  }
})

// POST /api/invoices/:id/send — send invoice to client via email
router.post("/:id/send", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("clientId", "companyName individualName primaryEmail")
    if (!invoice) return res.status(404).json({ error: "Invoice not found" })
    const client = invoice.clientId as { primaryEmail?: string; companyName?: string; individualName?: string }
    const clientName = client.companyName || client.individualName || "Valued Client"
    const clientEmail = client.primaryEmail
    if (!clientEmail) return res.status(400).json({ error: "Client has no email address" })

    await emailService.sendInvoiceIssued({
      to: clientEmail,
      clientName,
      invoiceNumber: invoice.invoiceNumber,
      amount: `₦${invoice.total.toLocaleString()}`,
      dueDate: invoice.dueDate ? invoice.dueDate.toLocaleDateString("en-GB") : "On demand",
      invoiceUrl: `${process.env.FRONTEND_URL}/dashboard/billing`,
    })

    await Invoice.findByIdAndUpdate(req.params.id, { status: "sent", issuedDate: new Date() })
    return res.json({ success: true })
  } catch (err) {
    console.error("[INVOICES] send error:", err)
    return res.status(500).json({ error: "Failed to send invoice" })
  }
})

// POST /api/invoices/:id/pay — initiate Paystack payment
router.post("/:id/pay", requireAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) return res.status(404).json({ error: "Invoice not found" })

    const client = await Client.findById(invoice.clientId)
    if (!client) return res.status(404).json({ error: "Client not found" })

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: client.primaryEmail,
        amount: Math.round(invoice.total * 100), // Paystack uses kobo
        reference: `INV-${invoice.invoiceNumber}-${Date.now()}`,
        callback_url: `${process.env.FRONTEND_URL}/dashboard/billing?payment=success`,
        metadata: { invoiceId: String(invoice._id) },
      }),
    })

    const data = (await response.json()) as { data?: { authorization_url?: string } }
    return res.json({ authorizationUrl: data.data?.authorization_url })
  } catch (err) {
    return res.status(500).json({ error: "Failed to initialize payment" })
  }
})

// POST /api/invoices/:id/upload-proof — upload bank transfer proof of payment
// Called by the client portal when the client has made a manual bank transfer
router.post("/:id/upload-proof", requireAuth, proofUpload.single("proof"), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
    if (!invoice) return res.status(404).json({ error: "Invoice not found" })

    if (!req.file) return res.status(400).json({ error: "No file uploaded" })

    // Upload proof to Cloudinary under the client's folder
    const result = await uploadDocument(
      req.file.path,
      String(invoice.clientId),
      undefined
    )

    // Store the proof URL in a notes field on the invoice
    const proofNote = `[Payment Proof] ${req.file.originalname} — uploaded ${new Date().toLocaleDateString("en-GB")} — ${result.secure_url}`
    await Invoice.findByIdAndUpdate(req.params.id, {
      $set: {
        notes: invoice.notes
          ? `${invoice.notes}\n${proofNote}`
          : proofNote,
      },
    })

    return res.json({ success: true, proofUrl: result.secure_url })
  } catch (err) {
    console.error("[INVOICES] upload-proof error:", err)
    return res.status(500).json({ error: "Failed to upload proof of payment" })
  }
})

export default router

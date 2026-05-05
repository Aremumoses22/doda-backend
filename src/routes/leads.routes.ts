import { Router } from "express"
import { z } from "zod"
import { Lead } from "../models/Lead.model"
import { emailService } from "../services/email.service"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()

const leadSchema = z.object({
  fullName:        z.string().min(2),
  email:           z.string().email(),
  phone:           z.string().min(10),
  companyName:     z.string().optional(),
  businessType:    z.string().optional(),
  serviceInterest: z.array(z.string()).optional(),
  engagementType:  z.string().optional(),
  description:     z.string().min(20),
  preferredTime:   z.string().optional(),
  referralSource:  z.string().optional(),
})

// POST /api/leads  — public endpoint (from website contact / book forms)
router.post("/", async (req, res) => {
  try {
    const data = leadSchema.parse(req.body)
    const lead = await Lead.create(data)

    // Fire emails in background — do not block response
    Promise.all([
      emailService.sendLeadConfirmation({
        to:   data.email,
        name: data.fullName,
      }),
      emailService.sendNewLeadAdmin({
        lead: {
          fullName:        data.fullName,
          email:           data.email,
          phone:           data.phone,
          companyName:     data.companyName,
          businessType:    data.businessType,
          serviceInterest: data.serviceInterest,
          engagementType:  data.engagementType,
          description:     data.description,
        },
      }),
    ]).catch((err) => console.error("[EMAIL] Failed to send lead emails:", err))

    return res.status(201).json({ success: true, id: lead._id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.issues })
    }
    console.error("[LEADS] Error creating lead:", err)
    return res.status(500).json({ error: "Something went wrong. Please try again." })
  }
})

// GET /api/leads  — admin only
router.get(
  "/",
  requireAuth,
  requireRole("principal", "admin_staff", "lawyer"),
  async (req, res) => {
    try {
      const { status, page = "1", limit = "20" } = req.query as Record<string, string>

      const filter: Record<string, string> = {}
      if (status) filter.status = status

      const skip  = (parseInt(page) - 1) * parseInt(limit)
      const total = await Lead.countDocuments(filter)
      const leads = await Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("assignedTo", "firstName lastName email")

      return res.json({ leads, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
    } catch (err) {
      console.error("[LEADS] Error fetching leads:", err)
      return res.status(500).json({ error: "Failed to fetch leads" })
    }
  }
)

// GET /api/leads/:id  — admin only
router.get(
  "/:id",
  requireAuth,
  requireRole("principal", "admin_staff", "lawyer"),
  async (req, res) => {
    const lead = await Lead.findById(req.params.id).populate("assignedTo", "firstName lastName email")
    if (!lead) return res.status(404).json({ error: "Lead not found" })
    return res.json(lead)
  }
)

// PATCH /api/leads/:id  — admin only
router.patch(
  "/:id",
  requireAuth,
  requireRole("principal", "admin_staff", "lawyer"),
  async (req, res) => {
    try {
      const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      if (!lead) return res.status(404).json({ error: "Lead not found" })
      return res.json(lead)
    } catch (err) {
      return res.status(500).json({ error: "Failed to update lead" })
    }
  }
)

// POST /api/leads/:id/convert  — convert lead to client (principal / admin_staff only)
router.post(
  "/:id/convert",
  requireAuth,
  requireRole("principal", "admin_staff"),
  async (req, res) => {
    try {
      const lead = await Lead.findById(req.params.id)
      if (!lead) return res.status(404).json({ error: "Lead not found" })
      if (lead.status === "converted") {
        return res.status(400).json({ error: "Lead already converted" })
      }
      // Mark as converted — full Client creation is handled by admin dashboard flow
      await Lead.findByIdAndUpdate(req.params.id, {
        status:      "converted",
        convertedAt: new Date(),
      })
      return res.json({ success: true, message: "Lead marked as converted" })
    } catch (err) {
      return res.status(500).json({ error: "Failed to convert lead" })
    }
  }
)

export default router

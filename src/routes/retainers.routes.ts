import { Router } from "express"
import { Retainer } from "../models/Retainer.model"
import { RetainerUsage } from "../models/RetainerUsage.model"
import { Client } from "../models/Client.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()
const billingRoles = ["principal", "billing_admin", "lawyer"] as const

// GET /api/retainers
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter: Record<string, unknown> = {}

    if (req.user!.role === "client") {
      // Clients may only see their own retainer
      const client = await Client.findOne({ userId: req.user!.id }).select("_id").lean()
      if (!client) return res.json({ retainers: [] })
      filter.clientId = client._id
    } else {
      // Admin roles can filter by status
      const { status } = req.query as { status?: string }
      if (status) filter.status = status
    }

    const retainers = await Retainer.find(filter)
      .sort({ createdAt: -1 })
      .populate("clientId", "companyName individualName clientCode primaryEmail")
      .populate("assignedToId", "firstName lastName")
    return res.json({ retainers })
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch retainers" })
  }
})

// GET /api/retainers/:id
router.get("/:id", requireAuth, requireRole(...billingRoles, "admin_staff"), async (req, res) => {
  try {
    const retainer = await Retainer.findById(req.params.id)
      .populate("clientId", "companyName individualName primaryEmail")
      .populate("assignedToId", "firstName lastName email")
    if (!retainer) return res.status(404).json({ error: "Retainer not found" })
    return res.json(retainer)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch retainer" })
  }
})

// POST /api/retainers
router.post("/", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    const retainer = await Retainer.create(req.body)
    return res.status(201).json(retainer)
  } catch (err) {
    return res.status(500).json({ error: "Failed to create retainer" })
  }
})

// PATCH /api/retainers/:id
router.patch("/:id", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    const retainer = await Retainer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!retainer) return res.status(404).json({ error: "Retainer not found" })
    return res.json(retainer)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update retainer" })
  }
})

// GET /api/retainers/:id/usage — monthly usage log
router.get("/:id/usage", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    const usage = await RetainerUsage.find({ retainerId: req.params.id })
      .sort({ month: -1 })
      .populate("loggedById", "firstName lastName")
      .populate("matterId", "title matterCode")
    return res.json(usage)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch usage" })
  }
})

// POST /api/retainers/:id/usage — log service usage
router.post("/:id/usage", requireAuth, requireRole(...billingRoles), async (req, res) => {
  try {
    const usage = await RetainerUsage.create({
      ...req.body,
      retainerId: req.params.id,
      loggedById: req.user!.id,
    })
    return res.status(201).json(usage)
  } catch (err) {
    return res.status(500).json({ error: "Failed to log usage" })
  }
})

export default router

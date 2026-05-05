import { Router } from "express"
import { Client } from "../models/Client.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()
const adminRoles = ["principal", "admin_staff", "lawyer", "billing_admin"] as const

// GET /api/clients
router.get("/", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const { status, engagementType, search, page = "1", limit = "20" } = req.query as Record<string, string>
    const filter: Record<string, unknown> = {}
    if (status) filter.status = status
    if (engagementType) filter.engagementType = engagementType
    if (search) {
      filter.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { individualName: { $regex: search, $options: "i" } },
        { primaryEmail: { $regex: search, $options: "i" } },
        { clientCode: { $regex: search, $options: "i" } },
      ]
    }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ onboardedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("accountManagerId", "firstName lastName email"),
      Client.countDocuments(filter),
    ])
    return res.json({ clients, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error("[CLIENTS] GET /:", err)
    return res.status(500).json({ error: "Failed to fetch clients" })
  }
})

// GET /api/clients/:id
router.get("/:id", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate("accountManagerId", "firstName lastName email")
      .populate("userId", "firstName lastName email isActive")
    if (!client) return res.status(404).json({ error: "Client not found" })
    return res.json(client)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch client" })
  }
})

// POST /api/clients
router.post("/", requireAuth, requireRole("principal", "admin_staff"), async (req, res) => {
  try {
    // Auto-generate clientCode if not provided
    let { clientCode } = req.body
    if (!clientCode) {
      const year = new Date().getFullYear()
      const count = await Client.countDocuments()
      clientCode = `CLT-${year}-${String(count + 1).padStart(3, "0")}`
      // Ensure uniqueness if there's a collision
      let exists = await Client.findOne({ clientCode })
      let i = count + 2
      while (exists) {
        clientCode = `CLT-${year}-${String(i).padStart(3, "0")}`
        exists = await Client.findOne({ clientCode })
        i++
      }
    }
    const client = await Client.create({ ...req.body, clientCode })
    return res.status(201).json(client)
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string }
    if (e.code === 11000) return res.status(409).json({ error: "Client code already exists" })
    console.error("[CLIENTS] POST /:", err)
    return res.status(500).json({ error: "Failed to create client" })
  }
})

// PATCH /api/clients/:id
router.patch("/:id", requireAuth, requireRole("principal", "admin_staff", "lawyer"), async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!client) return res.status(404).json({ error: "Client not found" })
    return res.json(client)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update client" })
  }
})

// DELETE /api/clients/:id — principal only, soft delete via status
router.delete("/:id", requireAuth, requireRole("principal"), async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true })
    if (!client) return res.status(404).json({ error: "Client not found" })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Failed to deactivate client" })
  }
})

export default router

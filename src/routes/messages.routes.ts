import { Router } from "express"
import { Message } from "../models/Message.model"
import { Client } from "../models/Client.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()

/** Resolve a client's ObjectId from their User id. Returns null if not found. */
async function getClientIdForUser(userId: string) {
  const client = await Client.findOne({ userId }).select("_id").lean()
  return client ? String(client._id) : null
}

// GET /api/messages  — admin gets all (grouped queries); clients get their own
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter: Record<string, unknown> = { isInternal: false }

    if (req.user!.role === "client") {
      const clientId = await getClientIdForUser(req.user!.id)
      if (!clientId) return res.json({ messages: [] })
      filter.clientId = clientId
    } else {
      // Admin can optionally filter by clientId query param
      if (req.query.clientId) filter.clientId = req.query.clientId
    }

    // Both admin and client can filter by matterId
    if (req.query.matterId) filter.matterId = req.query.matterId

    const limit = parseInt((req.query.limit as string) || "100", 10)
    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("clientId", "companyName individualName clientCode")
      .populate("senderId", "firstName lastName role")
    return res.json({ messages })
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch messages" })
  }
})

// GET /api/messages/client/:clientId — full thread for one client (admin only)
router.get(
  "/client/:clientId",
  requireAuth,
  requireRole("principal", "lawyer", "admin_staff"),
  async (req, res) => {
    try {
      const messages = await Message.find({ clientId: req.params.clientId })
        .sort({ createdAt: 1 })
        .populate("senderId", "firstName lastName role")
      return res.json({ messages })
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch thread" })
    }
  }
)

// POST /api/messages
router.post("/", requireAuth, async (req, res) => {
  try {
    let { clientId } = req.body

    // For clients, always resolve their clientId from the auth token
    if (req.user!.role === "client") {
      const resolvedClientId = await getClientIdForUser(req.user!.id)
      if (!resolvedClientId) {
        return res.status(400).json({ error: "No client record found for this user" })
      }
      clientId = resolvedClientId
    }

    if (!clientId) {
      return res.status(400).json({ error: "clientId is required" })
    }

    const message = await Message.create({
      ...req.body,
      clientId,
      senderId: req.user!.id,
    })
    const populated = await message.populate("senderId", "firstName lastName role")
    return res.status(201).json(populated)
  } catch (err) {
    console.error("[MESSAGES] POST error:", err)
    return res.status(500).json({ error: "Failed to send message" })
  }
})

// PATCH /api/messages/:id/read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(req.params.id, { readAt: new Date() }, { new: true })
    if (!msg) return res.status(404).json({ error: "Message not found" })
    return res.json(msg)
  } catch (err) {
    return res.status(500).json({ error: "Failed to mark as read" })
  }
})

export default router

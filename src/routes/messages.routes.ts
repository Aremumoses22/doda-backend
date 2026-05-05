import { Router } from "express"
import { Message } from "../models/Message.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()

// GET /api/messages  — admin gets all; clients get their own
router.get("/", requireAuth, async (req, res) => {
  try {
    const filter: Record<string, unknown> = { isInternal: false }
    if (req.user!.role === "client") {
      // clients only see their own messages — clientId must be linked to user
      filter.clientId = req.query.clientId
    }
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .populate("clientId", "companyName individualName clientCode")
      .populate("senderId", "firstName lastName role")
    return res.json(messages)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch messages" })
  }
})

// GET /api/messages/client/:clientId — full thread for one client
router.get(
  "/client/:clientId",
  requireAuth,
  requireRole("principal", "lawyer", "admin_staff"),
  async (req, res) => {
    try {
      const messages = await Message.find({ clientId: req.params.clientId })
        .sort({ createdAt: 1 })
        .populate("senderId", "firstName lastName role")
      return res.json(messages)
    } catch (err) {
      return res.status(500).json({ error: "Failed to fetch thread" })
    }
  }
)

// POST /api/messages
router.post("/", requireAuth, async (req, res) => {
  try {
    const message = await Message.create({
      ...req.body,
      senderId: req.user!.id,
    })
    return res.status(201).json(message)
  } catch (err) {
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

import { Router } from "express"
import { Notification } from "../models/Notification.model"
import { requireAuth } from "../middleware/auth.middleware"

const router = Router()

// GET /api/notifications  — current user's notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50)
    const unreadCount = await Notification.countDocuments({ userId: req.user!.id, isRead: false })
    return res.json({ notifications, unreadCount })
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch notifications" })
  }
})

// PATCH /api/notifications/read-all  — must be defined BEFORE /:id/read
router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Failed to mark all as read" })
  }
})

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { isRead: true },
      { new: true }
    )
    if (!notification) return res.status(404).json({ error: "Notification not found" })
    return res.json(notification)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update notification" })
  }
})

export default router

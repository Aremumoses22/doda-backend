import { Router } from "express"
import { Matter } from "../models/Matter.model"
import { MatterTask } from "../models/MatterTask.model"
import { Client } from "../models/Client.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()
const adminRoles = ["principal", "admin_staff", "lawyer", "billing_admin"] as const

// GET /api/matters
router.get("/", requireAuth, async (req, res) => {
  try {
    const { status, practiceArea, assignedToId, search, page = "1", limit = "20" } = req.query as Record<string, string>
    const filter: Record<string, unknown> = {}

    if (req.user!.role === "client") {
      // Clients only see their own matters
      const client = await Client.findOne({ userId: req.user!.id }).select("_id").lean()
      if (!client) return res.json({ matters: [], total: 0, page: 1, limit: parseInt(limit) })
      filter.clientId = client._id
    } else {
      // Admin: apply optional filters
      if (!adminRoles.includes(req.user!.role as typeof adminRoles[number])) {
        return res.status(403).json({ error: "Access denied" })
      }
      const { clientId } = req.query as Record<string, string>
      if (clientId) filter.clientId = clientId
    }

    if (status) filter.status = status
    if (practiceArea) filter.practiceArea = practiceArea
    if (assignedToId) filter.assignedToId = assignedToId
    if (search) filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { matterCode: { $regex: search, $options: "i" } },
    ]
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [matters, total] = await Promise.all([
      Matter.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("clientId", "companyName individualName clientCode")
        .populate("assignedToId", "firstName lastName email"),
      Matter.countDocuments(filter),
    ])

    // Attach tasks to each matter so client portal can show progress
    const matterIds = matters.map(m => m._id)
    const tasks = await MatterTask.find({ matterId: { $in: matterIds } })
      .select("matterId title status assignedToClient completedAt notes sortOrder")
      .lean()
    const tasksByMatter = new Map<string, typeof tasks>()
    tasks.forEach(t => {
      const key = String(t.matterId)
      if (!tasksByMatter.has(key)) tasksByMatter.set(key, [])
      tasksByMatter.get(key)!.push(t)
    })
    const mattersWithTasks = matters.map(m => ({
      ...(m.toObject ? m.toObject() : m),
      tasks: tasksByMatter.get(String(m._id)) ?? [],
    }))

    return res.json({ matters: mattersWithTasks, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    console.error("[MATTERS] GET /:", err)
    return res.status(500).json({ error: "Failed to fetch matters" })
  }
})

// GET /api/matters/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const matter = await Matter.findById(req.params.id)
      .populate("clientId", "companyName individualName clientCode primaryEmail")
      .populate("assignedToId", "firstName lastName email")
    if (!matter) return res.status(404).json({ error: "Matter not found" })

    // Clients may only view their own matters
    if (req.user!.role === "client") {
      const client = await Client.findOne({ userId: req.user!.id }).select("_id").lean()
      if (!client || String(matter.clientId) !== String(client._id)) {
        return res.status(403).json({ error: "Access denied" })
      }
    }

    // Attach tasks
    const tasks = await MatterTask.find({ matterId: matter._id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate("assignedToId", "firstName lastName")
    return res.json({ ...matter.toObject(), tasks })
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch matter" })
  }
})

// POST /api/matters
router.post("/", requireAuth, requireRole("principal", "admin_staff", "lawyer"), async (req, res) => {
  try {
    let { matterCode } = req.body
    if (!matterCode) {
      const year = new Date().getFullYear()
      const count = await Matter.countDocuments()
      matterCode = `MAT-${year}-${String(count + 1).padStart(3, "0")}`
      let exists = await Matter.findOne({ matterCode })
      let i = count + 2
      while (exists) {
        matterCode = `MAT-${year}-${String(i).padStart(3, "0")}`
        exists = await Matter.findOne({ matterCode })
        i++
      }
    }
    const matter = await Matter.create({ ...req.body, matterCode })
    return res.status(201).json(matter)
  } catch (err: unknown) {
    const e = err as { code?: number }
    if (e.code === 11000) return res.status(409).json({ error: "Matter code already exists" })
    return res.status(500).json({ error: "Failed to create matter" })
  }
})

// PATCH /api/matters/:id
router.patch("/:id", requireAuth, requireRole("principal", "admin_staff", "lawyer"), async (req, res) => {
  try {
    const matter = await Matter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!matter) return res.status(404).json({ error: "Matter not found" })
    return res.json(matter)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update matter" })
  }
})

// GET /api/matters/:id/tasks
router.get("/:id/tasks", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const tasks = await MatterTask.find({ matterId: req.params.id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate("assignedToId", "firstName lastName")
    return res.json(tasks)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch tasks" })
  }
})

// POST /api/matters/:id/tasks
router.post("/:id/tasks", requireAuth, requireRole("principal", "admin_staff", "lawyer"), async (req, res) => {
  try {
    const task = await MatterTask.create({ ...req.body, matterId: req.params.id })
    return res.status(201).json(task)
  } catch (err) {
    return res.status(500).json({ error: "Failed to create task" })
  }
})

// PATCH /api/matters/:id/tasks/:taskId
router.patch("/:id/tasks/:taskId", requireAuth, requireRole("principal", "admin_staff", "lawyer"), async (req, res) => {
  try {
    const task = await MatterTask.findOneAndUpdate(
      { _id: req.params.taskId, matterId: req.params.id },
      req.body,
      { new: true }
    )
    if (!task) return res.status(404).json({ error: "Task not found" })
    return res.json(task)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update task" })
  }
})

// DELETE /api/matters/:id/tasks/:taskId
router.delete("/:id/tasks/:taskId", requireAuth, requireRole("principal", "admin_staff", "lawyer"), async (req, res) => {
  try {
    await MatterTask.findOneAndDelete({ _id: req.params.taskId, matterId: req.params.id })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete task" })
  }
})

export default router

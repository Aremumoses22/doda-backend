import { Router } from "express"
import { Invoice } from "../models/Invoice.model"
import { Client } from "../models/Client.model"
import { Matter } from "../models/Matter.model"
import { Lead } from "../models/Lead.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()

// GET /api/reports/revenue
router.get("/revenue", requireAuth, requireRole("principal", "billing_admin"), async (req, res) => {
  try {
    const { year = String(new Date().getFullYear()) } = req.query as { year?: string }
    const startDate = new Date(`${year}-01-01`)
    const endDate = new Date(`${year}-12-31T23:59:59Z`)

    const [paidInvoices, outstandingInvoices, overdueInvoices] = await Promise.all([
      Invoice.aggregate([
        { $match: { status: "paid", paidDate: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: { $month: "$paidDate" }, total: { $sum: "$total" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ["sent", "partially_paid"] } } },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { status: "overdue" } },
        { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
      ]),
    ])

    return res.json({
      monthlyRevenue: paidInvoices,
      outstanding: outstandingInvoices[0] || { total: 0, count: 0 },
      overdue: overdueInvoices[0] || { total: 0, count: 0 },
    })
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate revenue report" })
  }
})

// GET /api/reports/matters
router.get("/matters", requireAuth, requireRole("principal", "lawyer"), async (req, res) => {
  try {
    const [byStatus, byPracticeArea, overdue] = await Promise.all([
      Matter.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Matter.aggregate([
        { $match: { status: { $in: ["active", "draft", "under_review"] } } },
        { $group: { _id: "$practiceArea", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Matter.countDocuments({
        status: { $ne: "completed" },
        dueDate: { $lt: new Date() },
      }),
    ])
    return res.json({ byStatus, byPracticeArea, overdueCount: overdue })
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate matter report" })
  }
})

// GET /api/reports/leads
router.get("/leads", requireAuth, requireRole("principal", "admin_staff"), async (req, res) => {
  try {
    const [byStatus, byService, recentMonths] = await Promise.all([
      Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Lead.aggregate([
        { $unwind: "$serviceInterest" },
        { $group: { _id: "$serviceInterest", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 6 },
      ]),
    ])
    return res.json({ byStatus, byService, recentMonths })
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate leads report" })
  }
})

// GET /api/reports/clients
router.get("/clients", requireAuth, requireRole("principal", "admin_staff"), async (req, res) => {
  try {
    const [byType, byEngagement, byStatus] = await Promise.all([
      Client.aggregate([{ $group: { _id: "$clientType", count: { $sum: 1 } } }]),
      Client.aggregate([{ $group: { _id: "$engagementType", count: { $sum: 1 } } }]),
      Client.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ])
    return res.json({ byType, byEngagement, byStatus })
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate client report" })
  }
})

export default router

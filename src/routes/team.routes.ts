import { Router } from "express"
import bcrypt from "bcryptjs"
import { User } from "../models/User.model"
import { TeamMember } from "../models/TeamMember.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"

const router = Router()
const adminRoles = ["principal", "admin_staff"] as const

// Map display roles (from frontend) to auth roles (User.role enum)
const ROLE_MAP: Record<string, "principal" | "lawyer" | "admin_staff" | "billing_admin"> = {
  principal:        "principal",
  senior_associate: "lawyer",
  associate:        "lawyer",
  paralegal:        "admin_staff",
  intern:           "admin_staff",
  lawyer:           "lawyer",
  admin_staff:      "admin_staff",
  billing_admin:    "billing_admin",
}

// GET /api/team
router.get("/", requireAuth, requireRole("principal", "admin_staff", "lawyer", "billing_admin"), async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || "50", 10)
    // Find all users who have a TeamMember record
    const members = await TeamMember.find({ isActive: true })
      .populate("userId", "firstName lastName email phone role isActive lastLoginAt createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)

    const team = members.map((m) => {
      const u = m.userId as any
      return {
        _id: m._id,
        userId: u?._id,
        firstName: u?.firstName,
        lastName: u?.lastName,
        email: u?.email,
        phone: u?.phone,
        role: u?.role,
        title: m.title,
        bio: m.bio,
        specialisms: m.specialisms,
        photoUrl: m.photoUrl,
        isActive: m.isActive && u?.isActive,
        lastLoginAt: u?.lastLoginAt,
        status: u?.isActive ? "active" : "inactive",
        createdAt: m.createdAt,
      }
    })

    return res.json({ team, total: team.length })
  } catch (err) {
    console.error("[TEAM] GET /:", err)
    return res.status(500).json({ error: "Failed to fetch team members" })
  }
})

// GET /api/team/:id
router.get("/:id", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id)
      .populate("userId", "-passwordHash -twoFaSecret")
    if (!member) return res.status(404).json({ error: "Team member not found" })
    return res.json(member)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch team member" })
  }
})

// POST /api/team — create user account + team member record
router.post("/", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, barNumber, title, bio, specialisms } = req.body

    if (!firstName || !email || !password) {
      return res.status(400).json({ error: "firstName, email and password are required" })
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: "A user with this email already exists" })
    }

    const authRole = ROLE_MAP[role] ?? "lawyer"
    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: authRole,
      firstName,
      lastName,
      phone: phone || undefined,
      isActive: true,
    })

    const member = await TeamMember.create({
      userId: user._id,
      title: title || (role ? role.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : undefined),
      bio: bio || undefined,
      specialisms: specialisms || [],
      isActive: true,
    })

    return res.status(201).json({
      _id: member._id,
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      title: member.title,
      specialisms: member.specialisms,
      status: "active",
      createdAt: member.createdAt,
    })
  } catch (err: any) {
    console.error("[TEAM] POST /:", err)
    if (err.code === 11000) {
      return res.status(409).json({ error: "A user with this email already exists" })
    }
    return res.status(500).json({ error: "Failed to create team member" })
  }
})

// PATCH /api/team/:id — update team member details
router.patch("/:id", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const { firstName, lastName, phone, title, bio, specialisms, isActive, role } = req.body

    const member = await TeamMember.findById(req.params.id)
    if (!member) return res.status(404).json({ error: "Team member not found" })

    // Update User fields if provided
    const userUpdate: Record<string, unknown> = {}
    if (firstName) userUpdate.firstName = firstName
    if (lastName) userUpdate.lastName = lastName
    if (phone !== undefined) userUpdate.phone = phone
    if (role && ROLE_MAP[role]) userUpdate.role = ROLE_MAP[role]
    if (isActive !== undefined) userUpdate.isActive = isActive

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(member.userId, userUpdate)
    }

    // Update TeamMember fields
    if (title !== undefined) member.title = title
    if (bio !== undefined) member.bio = bio
    if (specialisms !== undefined) member.specialisms = specialisms
    if (isActive !== undefined) member.isActive = isActive
    await member.save()

    return res.json({ success: true, _id: member._id })
  } catch (err) {
    console.error("[TEAM] PATCH /:id:", err)
    return res.status(500).json({ error: "Failed to update team member" })
  }
})

// DELETE /api/team/:id — deactivate (soft delete)
router.delete("/:id", requireAuth, requireRole("principal"), async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id)
    if (!member) return res.status(404).json({ error: "Team member not found" })

    await TeamMember.findByIdAndUpdate(req.params.id, { isActive: false })
    await User.findByIdAndUpdate(member.userId, { isActive: false })

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Failed to deactivate team member" })
  }
})

export default router

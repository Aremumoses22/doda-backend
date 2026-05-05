import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import { User } from "../models/User.model"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt"
import { requireAuth } from "../middleware/auth.middleware"

const router = Router()

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user (include passwordHash which is normally excluded)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash")
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const payload = { id: String(user._id), email: user.email, role: user.role }
    const accessToken  = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    // Store refresh token in an httpOnly cookie — cannot be read by JS
    res.cookie("doda_refresh", refreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    })

    // Record last login timestamp (fire-and-forget)
    User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec()

    return res.json({
      accessToken,
      user: {
        id:        user._id,
        email:     user.email,
        role:      user.role,
        firstName: user.firstName,
        lastName:  user.lastName,
      },
    })
  } catch (err) {
    console.error("[AUTH] Login error:", err)
    return res.status(500).json({ error: "Login failed. Please try again." })
  }
})

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post("/refresh", (req: Request, res: Response) => {
  const refreshToken = req.cookies.doda_refresh as string | undefined

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided" })
  }

  try {
    const decoded     = verifyRefreshToken(refreshToken)
    const accessToken = signAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role })
    return res.json({ accessToken })
  } catch {
    res.clearCookie("doda_refresh")
    return res.status(401).json({ error: "Refresh token is invalid or expired. Please log in again." })
  }
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", requireAuth, (req: Request, res: Response) => {
  res.clearCookie("doda_refresh", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
  })
  return res.json({ success: true, message: "Logged out successfully" })
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id).select(
      "-passwordHash -twoFaSecret"
    )
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    return res.json(user)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch user profile" })
  }
})

// ── PATCH /api/auth/change-password ──────────────────────────────────────────
router.patch("/change-password", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both currentPassword and newPassword are required" })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" })
    }

    const user = await User.findById(req.user!.id).select("+passwordHash")
    if (!user) return res.status(404).json({ error: "User not found" })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" })

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    await user.save()

    // Invalidate the refresh cookie so the user must re-login on other devices
    res.clearCookie("doda_refresh")
    return res.json({ success: true, message: "Password changed successfully. Please log in again." })
  } catch (err) {
    return res.status(500).json({ error: "Failed to change password" })
  }
})

export default router

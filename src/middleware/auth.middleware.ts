import { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../lib/jwt"

/**
 * requireAuth — validates the JWT access token in the Authorization header.
 * Attaches { id, email, role } to req.user if valid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null

  if (!token) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  try {
    const decoded = verifyAccessToken(token)
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}

/**
 * requireRole — must come AFTER requireAuth.
 * Restricts access to the given roles only.
 *
 * Usage: router.get("/", requireAuth, requireRole("principal", "admin_staff"), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "You do not have permission to access this resource" })
      return
    }
    next()
  }
}

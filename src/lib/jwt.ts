import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!
// Refresh token uses a different secret to prevent token type confusion attacks
const REFRESH_SECRET = process.env.JWT_SECRET! + "_refresh"

export interface JwtPayload {
  id: string
  email: string
  role: string
}

export function signAccessToken(payload: JwtPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "15m") as jwt.SignOptions["expiresIn"]
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export function signRefreshToken(payload: JwtPayload): string {
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"]
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload
}

import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import rateLimit from "express-rate-limit"

import authRoutes         from "./routes/auth.routes"
import leadsRoutes        from "./routes/leads.routes"
import clientsRoutes      from "./routes/clients.routes"
import mattersRoutes      from "./routes/matters.routes"
import documentsRoutes    from "./routes/documents.routes"
import invoicesRoutes     from "./routes/invoices.routes"
import messagesRoutes     from "./routes/messages.routes"
import retainersRoutes    from "./routes/retainers.routes"
import notificationsRoutes from "./routes/notifications.routes"
import reportsRoutes      from "./routes/reports.routes"
import webhooksRoutes     from "./routes/webhooks.routes"
import teamRoutes         from "./routes/team.routes"

const app = express()

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS — allow only the Next.js frontend ────────────────────────────────────
app.use(
  cors({
    origin:      process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,  // required for cookies (refresh token)
    methods:     ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

// ── Paystack webhook — needs RAW body, must come BEFORE express.json() ────────
// Paystack sends raw JSON with an HMAC-SHA512 signature we must verify
app.use(
  "/api/webhooks/paystack",
  express.raw({ type: "application/json" })
)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))
app.use(cookieParser())

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"))
}

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Tight limit on auth endpoints — 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  { error: "Too many login attempts. Please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api/auth/login", authLimiter)

// General API rate limit — 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api", generalLimiter)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes)
app.use("/api/leads",         leadsRoutes)
app.use("/api/clients",       clientsRoutes)
app.use("/api/matters",       mattersRoutes)
app.use("/api/documents",     documentsRoutes)
app.use("/api/invoices",      invoicesRoutes)
app.use("/api/messages",      messagesRoutes)
app.use("/api/retainers",     retainersRoutes)
app.use("/api/notifications", notificationsRoutes)
app.use("/api/reports",       reportsRoutes)
app.use("/api/webhooks",      webhooksRoutes)
app.use("/api/team",          teamRoutes)

// ── Health check (used by Railway for uptime monitoring) ──────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:      "ok",
    service:     "doda-backend",
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  })
})

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// ── Global error handler ──────────────────────────────────────────────────────
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[ERROR]", err.stack)
    res.status(500).json({ error: "Internal server error" })
  }
)

export default app

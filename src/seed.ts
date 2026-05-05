/**
 * Doda Backend — Database Seed Script
 *
 * Creates the initial principal (super-admin) account for Doda Legal Practitioners.
 *
 * Run with:  npm run db:seed
 *
 * ⚠️  Change the default password immediately after first login!
 */

import "dotenv/config"
import bcrypt from "bcryptjs"
import { connectDB, disconnectDB } from "./lib/db"
import { User } from "./models/User.model"
import { TeamMember } from "./models/TeamMember.model"

const PRINCIPAL_EMAIL    = "dodalegalpractitioners@gmail.com"
const TEMP_PASSWORD      = "ChangeMe123!"
const PRINCIPAL_FIRST    = "Oladoyin"
const PRINCIPAL_LAST     = "Odetunde"
const PRINCIPAL_PHONE    = "09028629933"

async function seed() {
  console.log("🌱 Doda seed script starting...\n")

  await connectDB()

  // ── 1. Principal user ───────────────────────────────────────────────────────
  const existing = await User.findOne({ email: PRINCIPAL_EMAIL })

  if (existing) {
    console.log(`⚠️  Principal account already exists: ${PRINCIPAL_EMAIL}`)
    console.log("   Nothing changed. Exiting.\n")
    await disconnectDB()
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12)

  const principal = await User.create({
    email:        PRINCIPAL_EMAIL,
    passwordHash,
    role:         "principal",
    firstName:    PRINCIPAL_FIRST,
    lastName:     PRINCIPAL_LAST,
    phone:        PRINCIPAL_PHONE,
    isActive:     true,
    twoFaEnabled: false,
  })

  console.log("✅ Principal user created:")
  console.log(`   Name:  ${principal.firstName} ${principal.lastName}`)
  console.log(`   Email: ${principal.email}`)
  console.log(`   Role:  ${principal.role}`)

  // ── 2. Team member profile for the principal ────────────────────────────────
  await TeamMember.create({
    userId:     principal._id,
    title:      "Principal",
    bio:        "Principal and Founder of Doda Legal Practitioners.",
    specialisms: ["corporate_law", "contracts", "startup_sme", "compliance"],
    isActive:   true,
  })

  console.log("✅ Team member profile created for principal\n")

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("────────────────────────────────────────────────────────────")
  console.log("🔑 LOGIN CREDENTIALS (DEVELOPMENT ONLY)")
  console.log(`   Email:    ${PRINCIPAL_EMAIL}`)
  console.log(`   Password: ${TEMP_PASSWORD}`)
  console.log("────────────────────────────────────────────────────────────")
  console.log("⚠️  IMPORTANT: Change this password immediately after first login!\n")

  await disconnectDB()
  process.exit(0)
}

seed().catch((err) => {
  console.error("❌ Seed script failed:", err)
  process.exit(1)
})

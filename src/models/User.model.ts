import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  email: string
  passwordHash: string
  role: "principal" | "lawyer" | "admin_staff" | "billing_admin" | "client"
  firstName: string
  lastName: string
  phone?: string
  isActive: boolean
  twoFaEnabled: boolean
  twoFaSecret?: string
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email:        { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         {
      type: String,
      required: true,
      enum: ["principal", "lawyer", "admin_staff", "billing_admin", "client"],
    },
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    phone:        { type: String, trim: true },
    isActive:     { type: Boolean, default: true },
    twoFaEnabled: { type: Boolean, default: false },
    twoFaSecret:  { type: String, select: false },  // never returned by default
    lastLoginAt:  Date,
  },
  { timestamps: true }
)

// Index for fast email lookups
UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })

export const User = mongoose.model<IUser>("User", UserSchema)

import mongoose, { Schema, Document, Types } from "mongoose"

export interface ITeamMember extends Document {
  userId: Types.ObjectId
  title?: string             // e.g. "Principal", "Associate Counsel"
  bio?: string
  specialisms: string[]      // e.g. ["corporate_law", "contracts"]
  photoUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    title:      { type: String, trim: true },
    bio:        String,
    specialisms: [String],
    photoUrl:   String,
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true }
)

TeamMemberSchema.index({ userId: 1 })

export const TeamMember = mongoose.model<ITeamMember>("TeamMember", TeamMemberSchema)

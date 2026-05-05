import mongoose, { Schema, Document, Types } from "mongoose"

export interface ILead extends Document {
  fullName: string
  email: string
  phone: string
  companyName?: string
  businessType?: string
  serviceInterest?: string[]
  engagementType?: string
  description?: string
  preferredTime?: string
  referralSource?: string
  status: "new" | "contacted" | "qualified" | "proposal_sent" | "converted" | "archived"
  internalNotes?: string
  assignedTo?: Types.ObjectId
  convertedAt?: Date
  clientId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const LeadSchema = new Schema<ILead>(
  {
    fullName:        { type: String, required: true, trim: true },
    email:           { type: String, required: true, trim: true, lowercase: true },
    phone:           { type: String, required: true, trim: true },
    companyName:     { type: String, trim: true },
    businessType:    String,
    serviceInterest: [String],
    engagementType:  String,
    description:     String,
    preferredTime:   String,
    referralSource:  String,
    status:          {
      type: String,
      default: "new",
      enum: ["new", "contacted", "qualified", "proposal_sent", "converted", "archived"],
    },
    internalNotes: String,
    assignedTo:    { type: Schema.Types.ObjectId, ref: "User" },
    convertedAt:   Date,
    clientId:      { type: Schema.Types.ObjectId, ref: "Client" },
  },
  { timestamps: true }
)

LeadSchema.index({ status: 1, createdAt: -1 })
LeadSchema.index({ email: 1 })

export const Lead = mongoose.model<ILead>("Lead", LeadSchema)

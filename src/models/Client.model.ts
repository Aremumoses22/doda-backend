import mongoose, { Schema, Document, Types } from "mongoose"

export interface IClient extends Document {
  clientCode: string
  userId?: Types.ObjectId
  companyName?: string
  individualName?: string
  clientType?: "startup_preseed" | "startup_growth" | "sme" | "corporate" | "investment_firm" | "venture_studio" | "real_estate" | "individual"
  industry?: string
  registrationNo?: string
  primaryEmail: string
  primaryPhone?: string
  address?: string
  engagementType?: "advisory" | "transactional" | "retainer" | "embedded"
  accountManagerId?: Types.ObjectId
  status: "active" | "on_hold" | "completed" | "inactive"
  leadId?: Types.ObjectId
  onboardedAt: Date
  createdAt: Date
  updatedAt: Date
}

const ClientSchema = new Schema<IClient>(
  {
    clientCode:       { type: String, unique: true, required: true, uppercase: true, trim: true },
    userId:           { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    companyName:      { type: String, trim: true },
    individualName:   { type: String, trim: true },
    clientType:       {
      type: String,
      enum: ["startup_preseed", "startup_growth", "sme", "corporate", "investment_firm", "venture_studio", "real_estate", "individual"],
    },
    industry:         String,
    registrationNo:   String,
    primaryEmail:     { type: String, required: true, lowercase: true, trim: true },
    primaryPhone:     String,
    address:          String,
    engagementType:   { type: String, enum: ["advisory", "transactional", "retainer", "embedded"] },
    accountManagerId: { type: Schema.Types.ObjectId, ref: "User" },
    status:           {
      type: String,
      default: "active",
      enum: ["active", "on_hold", "completed", "inactive"],
    },
    leadId:      { type: Schema.Types.ObjectId, ref: "Lead" },
    onboardedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

ClientSchema.index({ clientCode: 1 })
ClientSchema.index({ primaryEmail: 1 })
ClientSchema.index({ status: 1 })
ClientSchema.index({ accountManagerId: 1 })

export const Client = mongoose.model<IClient>("Client", ClientSchema)

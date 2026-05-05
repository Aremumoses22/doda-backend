import mongoose, { Schema, Document, Types } from "mongoose"

export interface IMatter extends Document {
  matterCode: string
  title: string
  description?: string
  clientId: Types.ObjectId
  practiceArea: "corporate_law" | "contracts" | "compliance" | "startup_sme" | "ip" | "property" | "general_advisory"
  assignedToId?: Types.ObjectId
  status: "draft" | "active" | "under_review" | "pending_client" | "completed" | "on_hold"
  priority: "high" | "normal" | "low"
  engagementType?: string
  feeArrangement?: string
  startDate?: Date
  dueDate?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const MatterSchema = new Schema<IMatter>(
  {
    matterCode:     { type: String, unique: true, required: true, uppercase: true, trim: true },
    title:          { type: String, required: true, trim: true },
    description:    String,
    clientId:       { type: Schema.Types.ObjectId, ref: "Client", required: true },
    practiceArea:   {
      type: String,
      required: true,
      enum: ["corporate_law", "contracts", "compliance", "startup_sme", "ip", "property", "general_advisory"],
    },
    assignedToId:   { type: Schema.Types.ObjectId, ref: "User" },
    status:         {
      type: String,
      default: "draft",
      enum: ["draft", "active", "under_review", "pending_client", "completed", "on_hold"],
    },
    priority:       { type: String, default: "normal", enum: ["high", "normal", "low"] },
    engagementType: String,
    feeArrangement: String,
    startDate:      Date,
    dueDate:        Date,
    completedAt:    Date,
  },
  { timestamps: true }
)

MatterSchema.index({ clientId: 1, status: 1 })
MatterSchema.index({ assignedToId: 1 })
MatterSchema.index({ dueDate: 1, status: 1 })

export const Matter = mongoose.model<IMatter>("Matter", MatterSchema)

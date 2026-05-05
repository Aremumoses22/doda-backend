import mongoose, { Schema, Document, Types } from "mongoose"

export interface IRetainerUsage extends Document {
  retainerId: Types.ObjectId
  month: Date
  serviceType: string
  description?: string
  unitsUsed: number
  loggedById?: Types.ObjectId
  matterId?: Types.ObjectId
  createdAt: Date
}

const RetainerUsageSchema = new Schema<IRetainerUsage>(
  {
    retainerId:  { type: Schema.Types.ObjectId, ref: "Retainer", required: true },
    month:       { type: Date, required: true },
    serviceType: { type: String, required: true },
    description: String,
    unitsUsed:   { type: Number, default: 1, min: 0 },
    loggedById:  { type: Schema.Types.ObjectId, ref: "User" },
    matterId:    { type: Schema.Types.ObjectId, ref: "Matter" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

RetainerUsageSchema.index({ retainerId: 1, month: 1 })

export const RetainerUsage = mongoose.model<IRetainerUsage>("RetainerUsage", RetainerUsageSchema)

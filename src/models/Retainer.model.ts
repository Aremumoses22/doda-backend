import mongoose, { Schema, Document as MongoDoc, Types } from "mongoose"

export interface IRetainer extends MongoDoc {
  clientId: Types.ObjectId
  planName: string
  monthlyFee: number
  currency: string
  allowances?: Record<string, unknown>
  startDate: Date
  renewalDate: Date
  status: "active" | "paused" | "cancelled" | "expired"
  autoRenew: boolean
  assignedToId?: Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const RetainerSchema = new Schema<IRetainer>(
  {
    clientId:     { type: Schema.Types.ObjectId, ref: "Client", required: true, unique: true },
    planName:     { type: String, required: true, trim: true },
    monthlyFee:   { type: Number, required: true, min: 0 },
    currency:     { type: String, default: "NGN" },
    allowances:   { type: Schema.Types.Mixed },
    startDate:    { type: Date, required: true },
    renewalDate:  { type: Date, required: true },
    status:       {
      type: String,
      default: "active",
      enum: ["active", "paused", "cancelled", "expired"],
    },
    autoRenew:    { type: Boolean, default: true },
    assignedToId: { type: Schema.Types.ObjectId, ref: "User" },
    notes:        String,
  },
  { timestamps: true }
)

RetainerSchema.index({ clientId: 1 })
RetainerSchema.index({ renewalDate: 1, status: 1 })

export const Retainer = mongoose.model<IRetainer>("Retainer", RetainerSchema)

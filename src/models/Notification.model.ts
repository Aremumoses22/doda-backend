import mongoose, { Schema, Document, Types } from "mongoose"

export interface INotification extends Document {
  userId: Types.ObjectId
  type: string       // e.g. "invoice_overdue", "matter_deadline", "message_received"
  title: string
  body?: string
  link?: string      // frontend route to navigate to
  isRead: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: "User", required: true },
    type:    { type: String, required: true },
    title:   { type: String, required: true },
    body:    String,
    link:    String,
    isRead:  { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema)

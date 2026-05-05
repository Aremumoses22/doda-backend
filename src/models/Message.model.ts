import mongoose, { Schema, Document, Types } from "mongoose"

export interface IMessage extends Document {
  clientId: Types.ObjectId
  matterId?: Types.ObjectId
  senderId: Types.ObjectId
  body: string
  isInternal: boolean      // true = staff-only (not visible to client)
  attachments: string[]    // Cloudinary public IDs
  readAt?: Date
  createdAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    clientId:    { type: Schema.Types.ObjectId, ref: "Client", required: true },
    matterId:    { type: Schema.Types.ObjectId, ref: "Matter" },
    senderId:    { type: Schema.Types.ObjectId, ref: "User", required: true },
    body:        { type: String, required: true },
    isInternal:  { type: Boolean, default: false },
    attachments: [String],
    readAt:      Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

MessageSchema.index({ clientId: 1, createdAt: -1 })
MessageSchema.index({ matterId: 1, createdAt: -1 })

export const Message = mongoose.model<IMessage>("Message", MessageSchema)

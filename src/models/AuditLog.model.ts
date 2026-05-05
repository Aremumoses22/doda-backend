import mongoose, { Schema, Document, Types } from "mongoose"

export interface IAuditLog extends Document {
  userId?: Types.ObjectId
  action: string           // e.g. "CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT"
  resourceType: string     // e.g. "Invoice", "Client", "Matter"
  resourceId?: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User" },
    action:       { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId:   String,
    changes:      { type: Schema.Types.Mixed },
    ipAddress:    String,
    userAgent:    String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // TTL index — keep audit logs for 2 years, then auto-delete
    // Uncomment to enable:
    // expireAfterSeconds: 63072000
  }
)

AuditLogSchema.index({ userId: 1, createdAt: -1 })
AuditLogSchema.index({ resourceType: 1, resourceId: 1 })

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)

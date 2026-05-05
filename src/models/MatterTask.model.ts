import mongoose, { Schema, Document, Types } from "mongoose"

export interface IMatterTask extends Document {
  matterId: Types.ObjectId
  title: string
  description?: string
  assignedToId?: Types.ObjectId
  assignedToClient: boolean
  dueDate?: Date
  status: "not_started" | "in_progress" | "blocked" | "completed"
  sortOrder: number
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const MatterTaskSchema = new Schema<IMatterTask>(
  {
    matterId:         { type: Schema.Types.ObjectId, ref: "Matter", required: true },
    title:            { type: String, required: true, trim: true },
    description:      String,
    assignedToId:     { type: Schema.Types.ObjectId, ref: "User" },
    assignedToClient: { type: Boolean, default: false },
    dueDate:          Date,
    status:           {
      type: String,
      default: "not_started",
      enum: ["not_started", "in_progress", "blocked", "completed"],
    },
    sortOrder:   { type: Number, default: 0 },
    completedAt: Date,
  },
  { timestamps: true }
)

MatterTaskSchema.index({ matterId: 1, sortOrder: 1 })

export const MatterTask = mongoose.model<IMatterTask>("MatterTask", MatterTaskSchema)

// ─────────────────────────────────────────────────────────────────────────────

export interface IMatterNote extends Document {
  matterId: Types.ObjectId
  body: string
  authorId: Types.ObjectId
  isInternal: boolean
  createdAt: Date
}

const MatterNoteSchema = new Schema<IMatterNote>(
  {
    matterId:   { type: Schema.Types.ObjectId, ref: "Matter", required: true },
    body:       { type: String, required: true },
    authorId:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    isInternal: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

MatterNoteSchema.index({ matterId: 1, createdAt: -1 })

export const MatterNote = mongoose.model<IMatterNote>("MatterNote", MatterNoteSchema)

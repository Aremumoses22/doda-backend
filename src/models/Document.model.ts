import mongoose, { Schema, Document, Types } from "mongoose"

export interface IDocument extends Document {
  name: string
  originalName: string
  cloudinaryPublicId: string   // stored in MongoDB, used to generate signed URLs via Cloudinary
  fileUrl: string              // secure_url from Cloudinary (for display)
  fileType?: string
  fileSize?: number
  category: "contract" | "agreement" | "advisory" | "compliance" | "id_document" | "financial" | "correspondence" | "other"
  clientId?: Types.ObjectId
  matterId?: Types.ObjectId
  uploadedById: Types.ObjectId
  version: string
  status: "draft" | "under_review" | "approved" | "signed" | "archived"
  visibleToClient: boolean
  signedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const DocumentSchema = new Schema<IDocument>(
  {
    name:               { type: String, required: true, trim: true },
    originalName:       { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    fileUrl:            { type: String, required: true },
    fileType:           String,
    fileSize:           Number,
    category:           {
      type: String,
      required: true,
      enum: ["contract", "agreement", "advisory", "compliance", "id_document", "financial", "correspondence", "other"],
    },
    clientId:       { type: Schema.Types.ObjectId, ref: "Client" },
    matterId:       { type: Schema.Types.ObjectId, ref: "Matter" },
    uploadedById:   { type: Schema.Types.ObjectId, ref: "User", required: true },
    version:        { type: String, default: "v1" },
    status:         {
      type: String,
      default: "draft",
      enum: ["draft", "under_review", "approved", "signed", "archived"],
    },
    visibleToClient: { type: Boolean, default: false },
    signedAt:        Date,
  },
  { timestamps: true }
)

DocumentSchema.index({ clientId: 1 })
DocumentSchema.index({ matterId: 1 })
DocumentSchema.index({ uploadedById: 1 })

export const LegalDocument = mongoose.model<IDocument>("Document", DocumentSchema)

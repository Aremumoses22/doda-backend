import mongoose, { Schema, Document, Types } from "mongoose"

// ── Line Item subdocument ─────────────────────────────────────────────────────
export interface ILineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  sortOrder: number
}

const LineItemSchema = new Schema<ILineItem>({
  description: { type: String, required: true },
  quantity:    { type: Number, default: 1, min: 0 },
  unitPrice:   { type: Number, required: true, min: 0 },
  total:       { type: Number, required: true, min: 0 },
  sortOrder:   { type: Number, default: 0 },
})

// ── Invoice document ──────────────────────────────────────────────────────────
export interface IInvoice extends Document {
  invoiceNumber: string
  clientId: Types.ObjectId
  matterId?: Types.ObjectId
  description?: string
  lineItems: ILineItem[]
  subtotal: number
  vatRate: number
  vatAmount?: number
  total: number
  currency: string
  revenueType?: string
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled" | "void"
  issuedDate?: Date
  dueDate?: Date
  paidDate?: Date
  paidAmount: number
  paymentMethod?: string
  notes?: string
  createdById?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, unique: true, required: true, uppercase: true },
    clientId:      { type: Schema.Types.ObjectId, ref: "Client", required: true },
    matterId:      { type: Schema.Types.ObjectId, ref: "Matter" },
    description:   String,
    lineItems:     [LineItemSchema],
    subtotal:      { type: Number, required: true, min: 0 },
    vatRate:       { type: Number, default: 7.5, min: 0 },
    vatAmount:     { type: Number, min: 0 },
    total:         { type: Number, required: true, min: 0 },
    currency:      { type: String, default: "NGN" },
    revenueType:   String,
    status:        {
      type: String,
      default: "draft",
      enum: ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled", "void"],
    },
    issuedDate:    Date,
    dueDate:       Date,
    paidDate:      Date,
    paidAmount:    { type: Number, default: 0, min: 0 },
    paymentMethod: String,
    notes:         String,
    createdById:   { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
)

InvoiceSchema.index({ clientId: 1, status: 1 })
InvoiceSchema.index({ dueDate: 1, status: 1 })
InvoiceSchema.index({ invoiceNumber: 1 })

export const Invoice = mongoose.model<IInvoice>("Invoice", InvoiceSchema)

import { Router } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { LegalDocument } from "../models/Document.model"
import { requireAuth, requireRole } from "../middleware/auth.middleware"
import { uploadDocument, getSignedUrl, deleteDocument } from "../services/storage.service"

const router = Router()
const adminRoles = ["principal", "lawyer"] as const

// Multer — temp disk storage (files cleaned up after Cloudinary upload)
const upload = multer({
  dest: "/tmp/doda-uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"]
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) return cb(null, true)
    cb(new Error("File type not allowed"))
  },
})

// GET /api/documents
router.get("/", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const { clientId, matterId, category, status, search, page = "1", limit = "20" } = req.query as Record<string, string>
    const filter: Record<string, unknown> = {}
    if (clientId) filter.clientId = clientId
    if (matterId) filter.matterId = matterId
    if (category) filter.category = category
    if (status) filter.status = status
    if (search) filter.name = { $regex: search, $options: "i" }
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [documents, total] = await Promise.all([
      LegalDocument.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("clientId", "companyName individualName clientCode")
        .populate("matterId", "title matterCode")
        .populate("uploadedById", "firstName lastName"),
      LegalDocument.countDocuments(filter),
    ])
    return res.json({ documents, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch documents" })
  }
})

// GET /api/documents/:id
router.get("/:id", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id)
      .populate("clientId", "companyName individualName")
      .populate("matterId", "title matterCode")
      .populate("uploadedById", "firstName lastName")
    if (!doc) return res.status(404).json({ error: "Document not found" })
    return res.json(doc)
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch document" })
  }
})

// POST /api/documents — multipart upload
router.post("/", requireAuth, requireRole(...adminRoles), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" })
  try {
    const { name, category, clientId, matterId, version = "v1", visibleToClient = "false" } = req.body
    const uploadResult = await uploadDocument(req.file.path, clientId, matterId)

    const doc = await LegalDocument.create({
      name: name || req.file.originalname,
      fileUrl: uploadResult.secure_url,
      fileType: path.extname(req.file.originalname).replace(".", ""),
      fileSize: req.file.size,
      cloudinaryPublicId: uploadResult.public_id,
      category: category || "other",
      clientId: clientId || null,
      matterId: matterId || null,
      uploadedById: req.user!.id,
      version,
      status: "draft",
      visibleToClient: visibleToClient === "true",
    })

    // Clean up temp file
    fs.unlink(req.file.path, () => {})

    return res.status(201).json(doc)
  } catch (err) {
    fs.unlink(req.file!.path, () => {})
    console.error("[DOCUMENTS] upload error:", err)
    return res.status(500).json({ error: "Failed to upload document" })
  }
})

// PATCH /api/documents/:id
router.patch("/:id", requireAuth, requireRole(...adminRoles), async (req, res) => {
  try {
    const doc = await LegalDocument.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!doc) return res.status(404).json({ error: "Document not found" })
    return res.json(doc)
  } catch (err) {
    return res.status(500).json({ error: "Failed to update document" })
  }
})

// DELETE /api/documents/:id
router.delete("/:id", requireAuth, requireRole("principal"), async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: "Document not found" })
    if (doc.cloudinaryPublicId) await deleteDocument(doc.cloudinaryPublicId)
    await doc.deleteOne()
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete document" })
  }
})

// GET /api/documents/:id/download — returns signed URL
router.get("/:id/download", requireAuth, async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: "Document not found" })

    // Clients can only download docs shared with them
    if (req.user!.role === "client" && !doc.visibleToClient) {
      return res.status(403).json({ error: "Access denied" })
    }

    const url = doc.cloudinaryPublicId
      ? await getSignedUrl(doc.cloudinaryPublicId)
      : doc.fileUrl

    return res.json({ url, name: doc.name })
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate download link" })
  }
})

export default router

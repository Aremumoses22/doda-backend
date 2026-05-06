import { v2 as cloudinary, UploadApiResponse } from "cloudinary"
import fs from "fs"
import path from "path"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FOLDER = process.env.CLOUDINARY_FOLDER || "doda"
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "local_uploads")
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8080}`
const LOCAL_PREFIX = "local/"

function localFallback(filePath: string): UploadApiResponse {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true })
  const fileName = `${Date.now()}-${path.basename(filePath)}`
  const destPath = path.join(LOCAL_UPLOADS_DIR, fileName)
  fs.copyFileSync(filePath, destPath)
  const publicId = `${LOCAL_PREFIX}${fileName}`
  return {
    secure_url: `${BACKEND_URL}/local_uploads/${fileName}`,
    public_id: publicId,
    url: `${BACKEND_URL}/local_uploads/${fileName}`,
    resource_type: "raw",
    format: path.extname(filePath).replace(".", ""),
  } as unknown as UploadApiResponse
}

export async function uploadDocument(
  filePath: string,
  clientId?: string,
  matterId?: string
): Promise<UploadApiResponse> {
  const folder = matterId
    ? `${FOLDER}/clients/${clientId}/matters/${matterId}`
    : clientId
      ? `${FOLDER}/clients/${clientId}/general`
      : `${FOLDER}/general`

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "raw",
      access_mode: "authenticated",
    })
    return result
  } catch (err) {
    console.warn("[STORAGE] Cloudinary upload failed, using local fallback:", (err as Error).message)
    return localFallback(filePath)
  }
}

export function getSignedUrl(publicId: string, expiresInSeconds = 1800): string {
  if (publicId.startsWith(LOCAL_PREFIX)) {
    const fileName = publicId.slice(LOCAL_PREFIX.length)
    return `${BACKEND_URL}/local_uploads/${fileName}`
  }
  return cloudinary.url(publicId, {
    resource_type: "raw",
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    type: "authenticated",
  })
}

export async function deleteDocument(publicId: string): Promise<void> {
  if (publicId.startsWith(LOCAL_PREFIX)) {
    const fileName = publicId.slice(LOCAL_PREFIX.length)
    const filePath = path.join(LOCAL_UPLOADS_DIR, fileName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return
  }
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" })
}

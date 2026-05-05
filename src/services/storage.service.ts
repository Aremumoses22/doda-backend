import { v2 as cloudinary, UploadApiResponse } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FOLDER = process.env.CLOUDINARY_FOLDER || "doda"

/**
 * Upload a file from local disk path to Cloudinary.
 * Stores in folder: doda/clients/:clientId/matters/:matterId  (or /general)
 */
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

  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "raw",       // handles PDFs, DOCX, XLSX
    access_mode: "authenticated", // private — requires signed URL to access
  })

  return result
}

/**
 * Generate a signed, time-limited access URL for a private Cloudinary resource.
 * Default expiry: 30 minutes.
 */
export function getSignedUrl(publicId: string, expiresInSeconds = 1800): string {
  return cloudinary.url(publicId, {
    resource_type: "raw",
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    type: "authenticated",
  })
}

/**
 * Permanently delete a file from Cloudinary.
 */
export async function deleteDocument(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" })
}

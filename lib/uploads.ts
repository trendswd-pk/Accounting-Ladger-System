/**
 * Client helpers: upload file bytes to Cloudflare R2, keep metadata in Supabase.
 *
 * Flow:
 *  1. POST /api/uploads/presign  → { uploadUrl, storageKey, publicUrl }
 *  2. PUT file directly to R2 (browser → R2, not through Next.js)
 *  3. POST /api/uploads/complete → verify object + insert file_attachments row
 */

export const UPLOAD_MAX_BYTES = 100 * 1024 * 1024 // 100MB

export const UPLOAD_ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'csv',
  'xlsx',
  'xls',
  'doc',
  'docx',
] as const

export type FileAttachment = {
  id: string
  storageKey: string
  publicUrl: string
  fileName: string
  mimeType: string
  sizeBytes: number
  folder: string
  createdAt: string
}

export function getFileExtension(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  if (i < 0) return ''
  return fileName.slice(i + 1).toLowerCase()
}

export function isAllowedUploadName(fileName: string): boolean {
  const ext = getFileExtension(fileName)
  return (UPLOAD_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

export function inferUploadMimeType(fileName: string, browserType?: string): string {
  const t = (browserType || '').trim()
  if (t && t !== 'application/octet-stream') return t
  const ext = getFileExtension(fileName)
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return map[ext] || 'application/octet-stream'
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error || fallback
  } catch {
    return fallback
  }
}

/** XHR PUT with progress (fetch cannot report upload progress). */
export function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return
      onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve()
        return
      }
      reject(new Error(`R2 upload failed (${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('R2 upload network error.'))
    xhr.send(file)
  })
}

/**
 * Full upload pipeline used by features (logo, vouchers, attachments, …).
 * Returns the Supabase `file_attachments` row (file lives on R2).
 */
export async function uploadFileToR2(
  file: File,
  options?: { folder?: string; onProgress?: (percent: number) => void }
): Promise<FileAttachment> {
  if (file.size <= 0) throw new Error('The file is empty.')
  if (file.size > UPLOAD_MAX_BYTES) throw new Error('File is larger than 100MB.')
  if (!isAllowedUploadName(file.name)) {
    throw new Error(`Allowed file types: ${UPLOAD_ALLOWED_EXTENSIONS.join(', ')}`)
  }

  const contentType = inferUploadMimeType(file.name, file.type)
  options?.onProgress?.(0)

  const presignRes = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType,
      folder: options?.folder ?? '',
    }),
  })
  if (!presignRes.ok) throw new Error(await readError(presignRes, 'Could not start upload.'))

  const presign = (await presignRes.json()) as {
    storageKey: string
    uploadUrl: string
    contentType: string
  }

  await putFileToPresignedUrl(presign.uploadUrl, file, presign.contentType, options?.onProgress)

  const completeRes = await fetch('/api/uploads/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      storageKey: presign.storageKey,
      mimeType: contentType,
      sizeBytes: file.size,
      folder: options?.folder ?? '',
    }),
  })
  if (!completeRes.ok) throw new Error(await readError(completeRes, 'Upload failed.'))

  const body = (await completeRes.json()) as { attachment: FileAttachment }
  return body.attachment
}

export async function deleteUploadedFile(id: string): Promise<void> {
  const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res, 'Could not delete file.'))
}

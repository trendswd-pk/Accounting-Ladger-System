/**
 * Client helpers: upload file bytes to Cloudflare R2.
 *
 * Fast path: compress → presign → browser PUT straight to R2 → complete (metadata).
 * Fallback: compress → POST /api/uploads (server proxies to R2) if direct PUT fails
 * (e.g. bucket CORS not set yet).
 */

import {
  compressForUpload,
  type CompressUploadOptions,
} from '@/lib/compressUpload'

export const UPLOAD_MAX_BYTES = 100 * 1024 * 1024 // 100MB

/** Legacy list kept for UI hints; transaction uploads accept any file type. */
export const UPLOAD_ALLOWED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'ico',
  'csv',
  'xlsx',
  'xls',
  'doc',
  'docx',
] as const

/** Image types suitable for logo / favicon branding uploads. */
export const BRAND_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'ico',
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

/** Any non-empty file name is allowed (all types). Branding still uses `isBrandImageName`. */
export function isAllowedUploadName(fileName: string): boolean {
  return String(fileName || '').trim().length > 0
}

export function isBrandImageName(fileName: string): boolean {
  const ext = getFileExtension(fileName)
  return (BRAND_IMAGE_EXTENSIONS as readonly string[]).includes(ext)
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
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    gz: 'application/gzip',
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

/** Same-origin XHR POST with upload progress (proxy fallback). */
function postFileToUploadApi(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<FileAttachment> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    if (folder) form.append('folder', folder)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/uploads')
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return
      onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        try {
          const body = JSON.parse(xhr.responseText) as { attachment: FileAttachment }
          if (!body.attachment?.publicUrl) {
            reject(new Error('Upload response was incomplete.'))
            return
          }
          resolve(body.attachment)
        } catch {
          reject(new Error('Upload response was invalid.'))
        }
        return
      }
      let message = `Upload failed (${xhr.status}).`
      try {
        const data = JSON.parse(xhr.responseText) as { error?: string }
        if (data.error) message = data.error
      } catch {
        /* keep status message */
      }
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error('Upload network error.'))
    xhr.send(form)
  })
}

function putFileToPresignedUrl(
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
      // Reserve 0–8% for compress/presign; 8–95% for R2 PUT.
      onProgress(8 + Math.round((e.loaded / e.total) * 87))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`Direct R2 upload failed (${xhr.status}).`))
    }
    xhr.onerror = () => reject(new Error('Direct R2 upload network error.'))
    xhr.send(file)
  })
}

/**
 * Fast path: browser → R2 (presigned), then tiny metadata POST.
 * Falls back to same-origin proxy if R2 CORS / PUT fails.
 */
async function uploadViaPresign(
  file: File,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<FileAttachment> {
  const contentType = inferUploadMimeType(file.name, file.type)
  onProgress?.(4)

  const presignRes = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType,
      folder,
    }),
  })
  if (!presignRes.ok) {
    throw new Error(await readError(presignRes, 'Could not prepare upload.'))
  }
  const presign = (await presignRes.json()) as {
    storageKey: string
    uploadUrl: string
    publicUrl: string
    contentType: string
  }
  if (!presign.uploadUrl || !presign.storageKey) {
    throw new Error('Upload preparation was incomplete.')
  }

  onProgress?.(8)
  await putFileToPresignedUrl(
    presign.uploadUrl,
    file,
    presign.contentType || contentType,
    onProgress
  )
  onProgress?.(96)

  const completeRes = await fetch('/api/uploads/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      storageKey: presign.storageKey,
      mimeType: contentType,
      sizeBytes: file.size,
      folder,
    }),
  })
  if (!completeRes.ok) {
    throw new Error(await readError(completeRes, 'Could not finalize upload.'))
  }
  const body = (await completeRes.json()) as { attachment: FileAttachment }
  if (!body.attachment?.publicUrl) {
    throw new Error('Upload finalize response was incomplete.')
  }
  onProgress?.(100)
  return body.attachment
}

/**
 * Full upload pipeline used by features (logo, vouchers, attachments, …).
 * Compresses lightly when helpful, then uploads via direct R2 (or proxy fallback).
 */
export async function uploadFileToR2(
  file: File,
  options?: {
    folder?: string
    onProgress?: (percent: number) => void
    compress?: CompressUploadOptions
  }
): Promise<FileAttachment> {
  if (file.size <= 0) throw new Error('The file is empty.')
  if (file.size > UPLOAD_MAX_BYTES) throw new Error('File is larger than 100MB.')
  if (!isAllowedUploadName(file.name)) {
    throw new Error('File name is required.')
  }

  const folder = options?.folder ?? ''
  options?.onProgress?.(0)
  const compressed = await compressForUpload(file, options?.compress)
  if (compressed.size > UPLOAD_MAX_BYTES) {
    throw new Error('File is larger than 100MB after compression.')
  }
  if (!isAllowedUploadName(compressed.name)) {
    throw new Error('File name is required.')
  }

  let attachment: FileAttachment
  try {
    attachment = await uploadViaPresign(compressed, folder, options?.onProgress)
  } catch {
    // CORS / network: fall back to same-origin proxy (still faster compress path).
    options?.onProgress?.(0)
    attachment = await postFileToUploadApi(compressed, folder, options?.onProgress)
  }
  const prev = listCache.get(folder) ?? []
  listCache.set(folder, [attachment, ...prev.filter((r) => r.id !== attachment.id)])
  return attachment
}

export async function deleteUploadedFile(id: string): Promise<void> {
  const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res, 'Could not delete file.'))
  // Drop any folder cache that contained this id.
  for (const [folder, rows] of listCache) {
    if (rows.some((r) => r.id === id)) {
      listCache.set(
        folder,
        rows.filter((r) => r.id !== id)
      )
    }
  }
}

/** Folder key used to group files under one transaction. */
export function transactionAttachmentFolder(transactionId: string): string {
  return `transactions/${String(transactionId).trim()}`
}

/** Folder key used to group files under one account. */
export function accountAttachmentFolder(accountId: string): string {
  return `accounts/${String(accountId).trim()}`
}

const listCache = new Map<string, FileAttachment[]>()
const listInflight = new Map<string, Promise<FileAttachment[]>>()

export function getCachedUploadedFiles(folder: string): FileAttachment[] | null {
  const hit = listCache.get(folder)
  return hit ? hit.map((r) => ({ ...r })) : null
}

export function setCachedUploadedFiles(folder: string, items: FileAttachment[]): void {
  listCache.set(folder, items.map((r) => ({ ...r })))
}

export function invalidateUploadedFilesCache(folder?: string): void {
  if (folder) {
    listCache.delete(folder)
    listInflight.delete(folder)
    return
  }
  listCache.clear()
  listInflight.clear()
}

export async function listUploadedFiles(
  folder: string,
  options?: { force?: boolean }
): Promise<FileAttachment[]> {
  const force = options?.force === true
  if (!force) {
    const hit = listCache.get(folder)
    if (hit) return hit.map((r) => ({ ...r }))
    const pending = listInflight.get(folder)
    if (pending) return pending.then((rows) => rows.map((r) => ({ ...r })))
  }

  const req = (async () => {
    const q = new URLSearchParams({ folder })
    const res = await fetch(`/api/uploads?${q.toString()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(await readError(res, 'Could not load files.'))
    const body = (await res.json()) as { attachments?: FileAttachment[] }
    const items = body.attachments ?? []
    listCache.set(folder, items)
    return items
  })()

  listInflight.set(folder, req)
  try {
    const items = await req
    return items.map((r) => ({ ...r }))
  } finally {
    if (listInflight.get(folder) === req) listInflight.delete(folder)
  }
}

export function formatUploadSize(bytes: number): string {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Client helpers: upload file bytes to Cloudflare R2 via same-origin API.
 *
 * Flow: compress → POST /api/uploads (multipart) → server PUTs to R2 → returns file_attachments row.
 * File bytes live on R2; only metadata is stored in Supabase.
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

/** Same-origin XHR POST with upload progress. */
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

/**
 * Full upload pipeline used by features (logo, vouchers, attachments, …).
 * Always compresses first (images resized/re-encoded; other files gzipped when smaller).
 * Returns the Supabase `file_attachments` row (file lives on R2).
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

  options?.onProgress?.(0)
  const compressed = await compressForUpload(file, options?.compress)
  if (compressed.size > UPLOAD_MAX_BYTES) {
    throw new Error('File is larger than 100MB after compression.')
  }
  if (!isAllowedUploadName(compressed.name)) {
    throw new Error('File name is required.')
  }

  return postFileToUploadApi(compressed, options?.folder ?? '', options?.onProgress)
}

export async function deleteUploadedFile(id: string): Promise<void> {
  const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res, 'Could not delete file.'))
}

/** Folder key used to group files under one transaction. */
export function transactionAttachmentFolder(transactionId: string): string {
  return `transactions/${String(transactionId).trim()}`
}

export async function listUploadedFiles(folder: string): Promise<FileAttachment[]> {
  const q = new URLSearchParams({ folder })
  const res = await fetch(`/api/uploads?${q.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await readError(res, 'Could not load files.'))
  const body = (await res.json()) as { attachments?: FileAttachment[] }
  return body.attachments ?? []
}

export function formatUploadSize(bytes: number): string {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

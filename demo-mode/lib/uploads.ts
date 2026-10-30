/**
 * Demo Mode uploads — store metadata + object URL / data URL in localStorage.
 * No R2 or network required.
 */

import {
  compressForUpload,
  type CompressUploadOptions,
} from '@/lib/compressUpload'
import { requireDemoUser } from '@/lib/demoAuth'
import { getStoredUploads, newId, setStoredUploads } from '@/lib/demoStore'

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Full upload pipeline used by features (logo, vouchers, attachments, …).
 * Compresses when possible, then stores a data URL in the demo sandbox.
 */
export async function uploadFileToR2(
  file: File,
  options?: {
    folder?: string
    onProgress?: (percent: number) => void
    compress?: CompressUploadOptions
  }
): Promise<FileAttachment> {
  requireDemoUser()
  if (file.size <= 0) throw new Error('The file is empty.')
  if (file.size > UPLOAD_MAX_BYTES) throw new Error('File is larger than 100MB.')
  if (!isAllowedUploadName(file.name)) {
    throw new Error('File name is required.')
  }

  options?.onProgress?.(10)
  const compressed = await compressForUpload(file, options?.compress)
  if (compressed.size > UPLOAD_MAX_BYTES) {
    throw new Error('File is larger than 100MB after compression.')
  }
  options?.onProgress?.(50)

  const publicUrl = await fileToDataUrl(compressed)
  options?.onProgress?.(90)

  const folder = options?.folder ?? ''
  const attachment: FileAttachment = {
    id: newId('file'),
    storageKey: `demo/${folder}/${compressed.name}`,
    publicUrl,
    fileName: compressed.name,
    mimeType: inferUploadMimeType(compressed.name, compressed.type),
    sizeBytes: compressed.size,
    folder,
    createdAt: new Date().toISOString(),
  }
  setStoredUploads([...getStoredUploads(), attachment])
  options?.onProgress?.(100)
  return attachment
}

export async function deleteUploadedFile(id: string): Promise<void> {
  requireDemoUser()
  setStoredUploads(getStoredUploads().filter((f) => f.id !== id))
}

/** Folder key used to group files under one transaction. */
export function transactionAttachmentFolder(transactionId: string): string {
  return `transactions/${String(transactionId).trim()}`
}

const listCache = new Map<string, FileAttachment[]>()

export function getCachedUploadedFiles(folder: string): FileAttachment[] | null {
  const hit = listCache.get(folder)
  return hit ? hit.map((r) => ({ ...r })) : null
}

export function setCachedUploadedFiles(folder: string, items: FileAttachment[]): void {
  listCache.set(folder, items.map((r) => ({ ...r })))
}

export function invalidateUploadedFilesCache(folder?: string): void {
  if (folder) listCache.delete(folder)
  else listCache.clear()
}

export async function listUploadedFiles(
  folder: string,
  _options?: { force?: boolean }
): Promise<FileAttachment[]> {
  requireDemoUser()
  const items = getStoredUploads().filter((f) => f.folder === folder)
  listCache.set(folder, items)
  return items.map((r) => ({ ...r }))
}

export function formatUploadSize(bytes: number): string {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

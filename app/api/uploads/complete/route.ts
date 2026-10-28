import { NextResponse } from 'next/server'
import {
  buildR2PublicUrl,
  getR2Config,
  headR2Object,
  isKeyUnderPrefix,
} from '@/lib/r2'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAllowedUploadName, UPLOAD_ALLOWED_EXTENSIONS } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AttachmentRow = {
  id: string
  storage_key: string
  public_url: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  folder: string | null
  created_at: string
}

function mapRow(row: AttachmentRow) {
  return {
    id: row.id,
    storageKey: row.storage_key,
    publicUrl: row.public_url,
    fileName: row.file_name,
    mimeType: row.mime_type || 'application/octet-stream',
    sizeBytes: Number(row.size_bytes ?? 0),
    folder: row.folder || '',
    createdAt: row.created_at,
  }
}

/**
 * POST: after browser PUT to R2, verify object exists and save metadata in Supabase.
 * File bytes stay on R2 — only storage_key / public_url / size land in the DB.
 */
export async function POST(request: Request) {
  let r2
  try {
    r2 = getR2Config()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'R2 is not configured.' },
      { status: 500 }
    )
  }

  const body = (await request.json().catch(() => null)) as {
    fileName?: string
    storageKey?: string
    mimeType?: string
    sizeBytes?: number
    folder?: string
  } | null

  const fileName = body?.fileName?.trim().slice(0, 160) ?? ''
  const storageKey = body?.storageKey?.trim() ?? ''
  const mimeType = (body?.mimeType || 'application/octet-stream').trim()
  const sizeBytes = Number(body?.sizeBytes ?? 0)
  const folder = String(body?.folder ?? '').trim()

  if (!fileName || !storageKey) {
    return NextResponse.json({ error: 'fileName and storageKey are required.' }, { status: 400 })
  }
  if (!isAllowedUploadName(fileName)) {
    return NextResponse.json(
      { error: `Allowed file types: ${UPLOAD_ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 }
    )
  }
  if (!isKeyUnderPrefix(r2, storageKey)) {
    return NextResponse.json({ error: 'Invalid storage key.' }, { status: 400 })
  }

  const head = await headR2Object(r2, storageKey)
  if (!head) {
    return NextResponse.json(
      { error: 'File not found on R2. Upload may have failed.' },
      { status: 400 }
    )
  }

  const publicUrl = buildR2PublicUrl(r2, storageKey)
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('file_attachments')
    .insert({
      storage_key: storageKey,
      public_url: publicUrl,
      file_name: fileName,
      mime_type: head.contentType || mimeType,
      size_bytes: head.size || sizeBytes,
      folder,
    })
    .select('id, storage_key, public_url, file_name, mime_type, size_bytes, folder, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attachment: mapRow(data) }, { status: 201 })
}

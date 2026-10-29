import { NextResponse } from 'next/server'
import {
  buildR2Key,
  buildR2PublicUrl,
  getR2Config,
  isKeyUnderPrefix,
  putR2Object,
} from '@/lib/r2'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  inferUploadMimeType,
  isAllowedUploadName,
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_MAX_BYTES,
} from '@/lib/uploads'

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

/** GET ?folder=transactions/<id> — list attachment metadata for a folder. */
export async function GET(request: Request) {
  const folder = new URL(request.url).searchParams.get('folder')?.trim() ?? ''
  if (!folder) {
    return NextResponse.json({ error: 'folder is required.' }, { status: 400 })
  }
  if (folder.length > 80 || folder.includes('..')) {
    return NextResponse.json({ error: 'Invalid folder.' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('file_attachments')
    .select('id, storage_key, public_url, file_name, mime_type, size_bytes, folder, created_at')
    .eq('folder', folder)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    attachments: (data ?? []).map((row) => mapRow(row as AttachmentRow)),
  })
}

/**
 * POST multipart: browser → this API → Cloudflare R2 (same account/bucket).
 * Avoids cross-origin PUT / bucket CORS failures.
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

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required.' }, { status: 400 })
  }

  const fileName = file.name.trim().slice(0, 160)
  const folder = String(form.get('folder') ?? '').trim()
  const sizeBytes = file.size

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
  }
  if (!isAllowedUploadName(fileName)) {
    return NextResponse.json(
      { error: `Allowed file types: ${UPLOAD_ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 }
    )
  }
  if (sizeBytes <= 0) {
    return NextResponse.json({ error: 'The file is empty.' }, { status: 400 })
  }
  if (sizeBytes > UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'File is larger than 100MB.' }, { status: 400 })
  }

  const storageKey = buildR2Key(r2, fileName, folder)
  if (!isKeyUnderPrefix(r2, storageKey)) {
    return NextResponse.json({ error: 'Invalid storage key.' }, { status: 500 })
  }

  const mimeType = inferUploadMimeType(fileName, file.type)
  const bytes = await file.arrayBuffer()
  const putErr = await putR2Object(r2, storageKey, bytes, mimeType)
  if (putErr) {
    return NextResponse.json({ error: putErr }, { status: 502 })
  }

  const publicUrl = buildR2PublicUrl(r2, storageKey)
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('file_attachments')
    .insert({
      storage_key: storageKey,
      public_url: publicUrl,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      folder,
    })
    .select('id, storage_key, public_url, file_name, mime_type, size_bytes, folder, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attachment: mapRow(data) }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

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
 * POST: attach an existing uploaded file to more folders without re-uploading bytes.
 * Inserts metadata rows that reuse the same storage_key + public_url.
 */
export async function POST(request: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  const body = (await request.json().catch(() => null)) as {
    attachmentId?: string
    folders?: string[]
  } | null

  const attachmentId = String(body?.attachmentId ?? '').trim()
  const folders = Array.isArray(body?.folders)
    ? [
        ...new Set(
          body.folders
            .map((f) => String(f ?? '').trim())
            .filter((f) => f && f.length <= 80 && !f.includes('..'))
        ),
      ]
    : []

  if (!attachmentId) {
    return NextResponse.json({ error: 'attachmentId is required.' }, { status: 400 })
  }
  if (folders.length === 0) {
    return NextResponse.json({ error: 'At least one folder is required.' }, { status: 400 })
  }
  if (folders.length > 40) {
    return NextResponse.json({ error: 'Too many folders in one request.' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  const { data: source, error: sourceError } = await admin
    .from('file_attachments')
    .select('id, storage_key, public_url, file_name, mime_type, size_bytes, folder, created_at')
    .eq('id', attachmentId)
    .maybeSingle()

  if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 })
  if (!source) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })

  const src = source as AttachmentRow
  const sourceFolder = src.folder || ''
  const targetFolders = folders.filter((f) => f !== sourceFolder)
  if (targetFolders.length === 0) {
    return NextResponse.json({ attachments: [], skipped: true })
  }

  const rows = targetFolders.map((folder) => ({
    storage_key: src.storage_key,
    public_url: src.public_url,
    file_name: src.file_name,
    mime_type: src.mime_type || 'application/octet-stream',
    size_bytes: Number(src.size_bytes ?? 0),
    folder,
  }))

  const { data, error } = await admin
    .from('file_attachments')
    .insert(rows)
    .select('id, storage_key, public_url, file_name, mime_type, size_bytes, folder, created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    {
      attachments: ((data ?? []) as AttachmentRow[]).map(mapRow),
    },
    { status: 201 }
  )
}

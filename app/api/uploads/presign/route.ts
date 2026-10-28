import { NextResponse } from 'next/server'
import {
  buildR2Key,
  buildR2PublicUrl,
  createPresignedPutUrl,
  getR2Config,
  isKeyUnderPrefix,
} from '@/lib/r2'
import {
  isAllowedUploadName,
  UPLOAD_ALLOWED_EXTENSIONS,
  UPLOAD_MAX_BYTES,
} from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST: presigned PUT URL — browser uploads file bytes straight to R2. */
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
    fileSize?: number
    contentType?: string
    folder?: string
  } | null

  const fileName = body?.fileName?.trim().slice(0, 160) ?? ''
  const fileSize = Number(body?.fileSize ?? 0)
  const contentType = (body?.contentType || 'application/octet-stream').trim()
  const folder = String(body?.folder ?? '').trim()

  if (!fileName) {
    return NextResponse.json({ error: 'File name is required.' }, { status: 400 })
  }
  if (!isAllowedUploadName(fileName)) {
    return NextResponse.json(
      { error: `Allowed file types: ${UPLOAD_ALLOWED_EXTENSIONS.join(', ')}` },
      { status: 400 }
    )
  }
  if (fileSize <= 0) {
    return NextResponse.json({ error: 'The file is empty.' }, { status: 400 })
  }
  if (fileSize > UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: 'File is larger than 100MB.' }, { status: 400 })
  }

  const storageKey = buildR2Key(r2, fileName, folder)
  if (!isKeyUnderPrefix(r2, storageKey)) {
    return NextResponse.json({ error: 'Invalid storage key.' }, { status: 500 })
  }

  const uploadUrl = createPresignedPutUrl(r2, storageKey, contentType)

  return NextResponse.json({
    storageKey,
    uploadUrl,
    publicUrl: buildR2PublicUrl(r2, storageKey),
    contentType,
  })
}

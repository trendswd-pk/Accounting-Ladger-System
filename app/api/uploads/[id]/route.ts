import { NextResponse } from 'next/server'
import { deleteR2Object, getR2Config, isKeyUnderPrefix } from '@/lib/r2'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

/** DELETE: remove R2 object + Supabase metadata row. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireUser()
  if (auth.error) return auth.error
  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  let r2
  try {
    r2 = getR2Config()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'R2 is not configured.' },
      { status: 500 }
    )
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('file_attachments')
    .select('id, storage_key')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Attachment not found.' }, { status: 404 })

  if (isKeyUnderPrefix(r2, data.storage_key)) {
    const delErr = await deleteR2Object(r2, data.storage_key)
    if (delErr) return NextResponse.json({ error: delErr }, { status: 500 })
  }

  const { error: deleteError } = await admin.from('file_attachments').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Public redirect from attachment id → R2 public URL.
 * Used for ad-free WhatsApp ledger links without requiring short_links table.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const id = String(params.id ?? '').trim()
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('file_attachments')
      .select('public_url')
      .eq('id', id)
      .maybeSingle()

    const target = String(data?.public_url ?? '').trim()
    if (error || !target) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.redirect(target, 302)
  } catch {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
}

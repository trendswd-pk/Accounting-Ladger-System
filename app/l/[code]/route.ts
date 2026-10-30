import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: { code: string } }

/** Public redirect — no login required (WhatsApp recipients). */
export async function GET(_req: Request, { params }: Ctx) {
  const code = String(params.code ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 32)

  if (!code) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('short_links')
      .select('target_url')
      .eq('code', code)
      .maybeSingle()

    if (error || !data?.target_url) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.redirect(data.target_url, 302)
  } catch {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
}

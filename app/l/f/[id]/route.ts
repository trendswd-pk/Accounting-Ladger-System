import { NextResponse } from 'next/server'
import {
  kindFromFolder,
  shareLinkHtmlResponse,
  titleFromFileName,
} from '@/lib/shareLinkHtml'
import { siteUrl } from '@/lib/siteUrl'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Public share page for an attachment.
 * Returns branded HTML + Open Graph so WhatsApp / messengers show a preview.
 * Use `?raw=1` for a direct 302 to the file (no preview page).
 */
export async function GET(req: Request, { params }: Ctx) {
  const id = String(params.id ?? '').trim()
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const wantRaw = new URL(req.url).searchParams.get('raw') === '1'

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('file_attachments')
      .select('public_url, file_name, folder')
      .eq('id', id)
      .maybeSingle()

    const target = String(data?.public_url ?? '').trim()
    if (error || !target) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (wantRaw) {
      return NextResponse.redirect(target, 302)
    }

    const fileName = String(data?.file_name ?? '').trim()
    const folder = String(data?.folder ?? '').trim()
    const title = titleFromFileName(fileName)
    const kind = kindFromFolder(folder, fileName)
    let origin = siteUrl()
    try {
      origin = new URL(req.url).origin
    } catch {
      /* keep siteUrl */
    }
    const pageUrl = `${origin}/l/f/${encodeURIComponent(id)}`

    return shareLinkHtmlResponse({
      pageUrl,
      fileUrl: target,
      title,
      kind,
    })
  } catch {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
}

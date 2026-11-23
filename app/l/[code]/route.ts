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

type Ctx = { params: { code: string } }

function pageOrigin(req: Request): string {
  try {
    return new URL(req.url).origin
  } catch {
    return siteUrl()
  }
}

/**
 * Public short-link share page (Open Graph preview + open PDF).
 * Use `?raw=1` for a direct redirect to the stored target.
 */
export async function GET(req: Request, { params }: Ctx) {
  const code = String(params.code ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 32)

  if (!code) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const wantRaw = new URL(req.url).searchParams.get('raw') === '1'

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('short_links')
      .select('target_url')
      .eq('code', code)
      .maybeSingle()

    const target = String(data?.target_url ?? '').trim()
    if (error || !target) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (wantRaw) {
      return NextResponse.redirect(target, 302)
    }

    let fileUrl = target
    let title = 'Shared document'
    let kind = 'document' as ReturnType<typeof kindFromFolder>

    try {
      const u = new URL(target)
      const m = u.pathname.match(/\/l\/f\/([0-9a-f-]{36})$/i)
      if (m?.[1]) {
        const { data: att } = await admin
          .from('file_attachments')
          .select('public_url, file_name, folder')
          .eq('id', m[1])
          .maybeSingle()
        if (att?.public_url) {
          fileUrl = String(att.public_url)
          const fileName = String(att.file_name ?? '')
          const folder = String(att.folder ?? '')
          title = titleFromFileName(fileName)
          kind = kindFromFolder(folder, fileName)
        }
      } else {
        const leaf = decodeURIComponent(u.pathname.split('/').pop() || '')
        title = titleFromFileName(leaf)
        kind = kindFromFolder(u.pathname, leaf)
      }
    } catch {
      /* keep defaults */
    }

    const pageUrl = `${pageOrigin(req)}/l/${encodeURIComponent(code)}`
    return shareLinkHtmlResponse({
      pageUrl,
      fileUrl,
      title,
      kind,
    })
  } catch {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }
}

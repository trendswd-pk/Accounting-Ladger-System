import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import {
  generateShortCode,
  isHttpUrl,
  publicAppOrigin,
} from '@/lib/shortLinks'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status })
}

/**
 * Create an ad-free first-party short link: {origin}/l/{code}
 * (replaces TinyURL / is.gd which inject interstitial ads).
 */
export async function POST(req: Request) {
  const auth = await requireUser()
  if (auth.error) return auth.error

  let body: { url?: unknown }
  try {
    body = (await req.json()) as { url?: unknown }
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const url = String(body.url ?? '').trim()
  if (!url || !isHttpUrl(url)) {
    return json({ error: 'A valid http(s) URL is required.' }, 400)
  }
  if (url.length > 2000) {
    return json({ error: 'URL is too long.' }, 400)
  }

  // Reuse existing short code for the same target when possible.
  try {
    const admin = getSupabaseAdmin()
    const { data: existing } = await admin
      .from('short_links')
      .select('code')
      .eq('target_url', url)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const origin = publicAppOrigin(req)
    if (existing?.code) {
      return json({ shortUrl: `${origin}/l/${existing.code}` })
    }

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = generateShortCode(7)
      const { error } = await admin.from('short_links').insert({
        code,
        target_url: url,
      })
      if (!error) {
        return json({ shortUrl: `${origin}/l/${code}` })
      }
      // Unique violation → retry with a new code
      if (!/duplicate|unique/i.test(error.message)) {
        return json(
          {
            error:
              'Short links table missing. Run database/migrations/2026-10-30_short_links_no_ads.sql',
          },
          500
        )
      }
    }
    return json({ error: 'Could not allocate a short code.' }, 500)
  } catch (err) {
    return json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not create short link.',
      },
      500
    )
  }
}

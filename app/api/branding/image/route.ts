import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Same-origin proxy for branding images (logo) so client PDF export
 * can load them without depending on R2 bucket CORS.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url')?.trim() ?? ''
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'url is required.' }, { status: 400 })
  }

  const publicBase = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '')
  if (!publicBase || !url.startsWith(`${publicBase}/`)) {
    return NextResponse.json({ error: 'URL not allowed.' }, { status: 403 })
  }

  try {
    const upstream = await fetch(url, { cache: 'force-cache' })
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Image fetch failed.' }, { status: 502 })
    }
    const contentType = upstream.headers.get('content-type') || 'image/png'
    const bytes = await upstream.arrayBuffer()
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Image fetch failed.' }, { status: 502 })
  }
}

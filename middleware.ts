import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { pathname } = request.nextUrl
  const isLogin = pathname === '/login'
  // Vercel Cron has no session cookie; /api/cron authenticates via CRON_SECRET itself.
  const isCron = pathname === '/api/cron'
  const isApi = pathname.startsWith('/api/')
  // Ad-free short links shared on WhatsApp — must work without login.
  const isPublicShortLink = pathname.startsWith('/l/')
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons/') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|webmanifest)$/i.test(pathname)

  if (isPublicAsset || isCron || isPublicShortLink) return supabaseResponse

  // Page navigations: read session from cookies only (no Auth network round-trip).
  // That was making every Link click wait 2–4s. APIs still verify with getUser below.
  if (!isApi) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session && !isLogin) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (session && isLogin) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/'
      redirectUrl.search = ''
      return NextResponse.redirect(redirectUrl)
    }

    return supabaseResponse
  }

  // API: do not call getUser here — each route uses requireUser() once.
  // Avoids a double Auth round-trip on every save/list request.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except static Next internals, PWA assets, and image files.
     */
    '/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
}

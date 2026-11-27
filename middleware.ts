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
  // Auth email links + recovery + post-callback continue must work without a prior session.
  const isAuthPublic =
    isLogin ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/auth/callback/') ||
    pathname === '/auth/continue' ||
    pathname.startsWith('/auth/continue/')
  // Vercel Cron has no session cookie; /api/cron authenticates via CRON_SECRET itself.
  const isCron = pathname === '/api/cron'
  const isApi = pathname.startsWith('/api/')
  // Ad-free short links shared on WhatsApp — must work without login.
  const isPublicShortLink = pathname.startsWith('/l/')
  // PIN-gated ledger preview for account recipients.
  const isPublicLedgerShare = pathname.startsWith('/share/')
  // OG/Twitter image routes must be crawlable without a session.
  const isLinkPreviewImage =
    pathname === '/opengraph-image' ||
    pathname.startsWith('/opengraph-image/') ||
    pathname === '/twitter-image' ||
    pathname.startsWith('/twitter-image/')
  const isPublicAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons/') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/.well-known/') ||
    isLinkPreviewImage ||
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|webmanifest)$/i.test(pathname)

  if (isPublicAsset || isCron || isPublicShortLink || isPublicLedgerShare) {
    return supabaseResponse
  }

  // Page navigations: read session from cookies only (no Auth network round-trip).
  // That was making every Link click wait 2–4s. APIs still verify with getUser below.
  if (!isApi) {
    // Magic link / OTP / recovery often land on Site URL (/, /login, …) with ?code= or
    // ?token_hash=. If we bounce to /login first we used to drop those params and the
    // user stuck on Login. Forward to /auth/callback instead (keeps recovery next).
    const authCode = request.nextUrl.searchParams.get('code')
    const tokenHash = request.nextUrl.searchParams.get('token_hash')
    if (
      (authCode || tokenHash) &&
      pathname !== '/auth/callback' &&
      !pathname.startsWith('/auth/callback/')
    ) {
      const callbackUrl = request.nextUrl.clone()
      callbackUrl.pathname = '/auth/callback'
      const type = callbackUrl.searchParams.get('type')
      if (!callbackUrl.searchParams.get('next')) {
        if (type === 'recovery') {
          callbackUrl.searchParams.set('next', '/reset-password')
        } else if (pathname === '/login' || pathname === '/forgot-password') {
          callbackUrl.searchParams.set('next', '/auth/continue')
        } else if (pathname === '/reset-password') {
          callbackUrl.searchParams.set('next', '/reset-password')
        } else {
          callbackUrl.searchParams.set('next', '/auth/continue')
        }
      } else if (callbackUrl.searchParams.get('next') === '/') {
        callbackUrl.searchParams.set('next', '/auth/continue')
      }
      return NextResponse.redirect(callbackUrl)
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Embedded Demo Mode: cookie-only guest; never a Supabase user. APIs stay protected.
    const isDemoMode = request.cookies.get('als_demo_mode')?.value === '1'

    if (!session && !isAuthPublic && !isDemoMode) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.search = ''
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Real auth wins over demo cookie — send signed-in users away from /login.
    // Keep recovery session on /reset-password so they can set a new password.
    // /auth/continue finishes magic-link bootstrap before entering the shell.
    if (session && isLogin) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/continue'
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

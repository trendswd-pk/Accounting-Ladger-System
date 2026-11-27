import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import {
  authCallbackFailurePath,
  resolveAuthCallbackNext,
} from '@/lib/authCallback'

/**
 * Exchanges a Supabase auth `code` (PKCE) or `token_hash` for a session cookie.
 *
 * Flows (kept separate):
 * - Email verification / signup / invite → `/auth/continue?flow=verify` → app
 * - Magic link / OTP sign-in → `/auth/continue` → app
 * - Password recovery → `/reset-password` only when type=recovery or next set
 *
 * Signup emails must set emailRedirectTo → `/auth/callback?next=/auth/continue&flow=verify`
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const flowHint = searchParams.get('flow')
  const resolved = resolveAuthCallbackNext({
    nextParam: searchParams.get('next'),
    type,
  })

  const wantVerify =
    resolved.isEmailVerification || flowHint === 'verify' || flowHint === 'email'

  let next: string
  if (resolved.isRecovery) {
    next = '/reset-password'
  } else if (
    resolved.next === '/auth/continue' ||
    resolved.next.startsWith('/auth/continue')
  ) {
    const continueUrl = new URL(resolved.next, origin)
    if (wantVerify && !continueUrl.searchParams.get('flow')) {
      continueUrl.searchParams.set('flow', 'verify')
    }
    next = `${continueUrl.pathname}${continueUrl.search}`
  } else {
    const continueUrl = new URL('/auth/continue', origin)
    continueUrl.searchParams.set('next', resolved.next)
    if (wantVerify) continueUrl.searchParams.set('flow', 'verify')
    next = `${continueUrl.pathname}${continueUrl.search}`
  }

  const isRecovery = resolved.isRecovery || next.startsWith('/reset-password')
  const failUrl = new URL(authCallbackFailurePath(isRecovery), origin)

  if (searchParams.get('error') || searchParams.get('error_description')) {
    return NextResponse.redirect(failUrl)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(failUrl)
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(failUrl)
  }

  let response = NextResponse.redirect(`${origin}${next}`)
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.redirect(`${origin}${next}`)
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(failUrl)
    }
    return response
  }

  // Email template links that use token_hash + type (signup / email / recovery / …).
  const otpType = (type || (wantVerify ? 'signup' : 'email')) as EmailOtpType
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash!,
    type: otpType,
  })
  if (error) {
    return NextResponse.redirect(failUrl)
  }
  return response
}

/**
 * Shared helpers for Supabase email-link callbacks (magic link / invite / OTP
 * vs password recovery). Used by the route handler and middleware.
 */

export function safeAuthNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return fallback
  if (raw === '/login' || raw === '/forgot-password') return fallback
  // Allow /auth/continue as a post-magic-link hop; block other /auth/* destinations.
  if (raw.startsWith('/auth/') && !raw.startsWith('/auth/continue')) return fallback
  return raw
}

/** Password-recovery links must land on reset; everything else enters the app. */
export function isRecoveryAuthType(type: string | null | undefined): boolean {
  return String(type || '').toLowerCase() === 'recovery'
}

/** Signup / invite / email confirmation OTP types (not recovery, not magic-only). */
export function isEmailVerificationAuthType(type: string | null | undefined): boolean {
  const t = String(type || '').toLowerCase()
  return t === 'signup' || t === 'email' || t === 'invite'
}

export function resolveAuthCallbackNext(opts: {
  nextParam: string | null
  type: string | null
}): { next: string; isRecovery: boolean; isEmailVerification: boolean } {
  const type = opts.type
  const explicitNext = opts.nextParam
  const isEmailVerification = isEmailVerificationAuthType(type)

  if (isRecoveryAuthType(type) || explicitNext === '/reset-password') {
    return { next: '/reset-password', isRecovery: true, isEmailVerification: false }
  }

  return {
    next: safeAuthNextPath(explicitNext, '/'),
    isRecovery: false,
    isEmailVerification,
  }
}

export function authCallbackFailurePath(isRecovery: boolean): string {
  if (isRecovery) return '/forgot-password?error=reset_link_invalid'
  return '/login?error=auth_link_invalid'
}

/** Canonical redirect used in signup + invite emails (web and Capacitor origin). */
export function emailVerificationRedirectTo(origin: string): string {
  const base = origin.replace(/\/+$/, '')
  return `${base}/auth/callback?next=${encodeURIComponent('/auth/continue')}&flow=verify`
}

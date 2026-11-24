/**
 * Embedded Demo Mode session for the main app.
 * Cookie lets middleware allow navigation without a Supabase session.
 * localStorage holds the guest profile; ledger data lives in embeddedDemo/store.
 */

export const DEMO_COOKIE = 'als_demo_mode'
export const DEMO_SESSION_KEY = 'als:demo:als-main:session'
export const DEMO_GUEST_USER_ID = 'demo-guest'

export type DemoAuthUser = {
  id: string
  email: string
  fullName: string
  role: 'owner' | 'viewer'
}

export type DemoSession = {
  userId: string
  email: string
  fullName: string
  role: 'owner' | 'viewer'
}

const GUEST: DemoSession = {
  userId: DEMO_GUEST_USER_ID,
  email: 'demo@northline.local',
  fullName: 'Demo Reviewer',
  role: 'owner',
}

function readSessionRaw(): DemoSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DemoSession
    if (!parsed?.userId || !parsed?.email) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(session: DemoSession | null): void {
  if (typeof window === 'undefined') return
  if (!session) {
    localStorage.removeItem(DEMO_SESSION_KEY)
    return
  }
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
}

/** Client: cookie present (middleware) or localStorage session. */
export function isEmbeddedDemoActive(): boolean {
  if (typeof window === 'undefined') return false
  if (document.cookie.split(';').some((c) => c.trim().startsWith(`${DEMO_COOKIE}=1`))) {
    return true
  }
  return readSessionRaw() != null
}

export function getDemoSession(): DemoSession | null {
  return readSessionRaw()
}

export function getDemoUser(): DemoAuthUser | null {
  const session = readSessionRaw()
  if (!session) return null
  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    role: session.role,
  }
}

export function requireDemoUser(): DemoAuthUser {
  const user = getDemoUser()
  if (!user) throw new Error('Unauthorized. Please sign in.')
  return user
}

export function setDemoModeCookie(on: boolean): void {
  if (typeof document === 'undefined') return
  if (on) {
    document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax`
  } else {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  }
}

/** Start guest demo: cookie + session. Caller seeds data and navigates. */
export function beginEmbeddedDemoSession(): DemoAuthUser {
  writeSession(GUEST)
  setDemoModeCookie(true)
  return {
    id: GUEST.userId,
    email: GUEST.email,
    fullName: GUEST.fullName,
    role: GUEST.role,
  }
}

export function endEmbeddedDemoSession(): void {
  writeSession(null)
  setDemoModeCookie(false)
}

export function updateDemoProfile(input: {
  fullName?: string
  email?: string
}): DemoAuthUser {
  const session = readSessionRaw()
  if (!session) throw new Error('Unauthorized. Please sign in.')
  const next: DemoSession = {
    ...session,
    fullName:
      input.fullName !== undefined
        ? String(input.fullName).trim() || session.fullName
        : session.fullName,
    email:
      input.email !== undefined
        ? String(input.email).trim() || session.email
        : session.email,
  }
  writeSession(next)
  return {
    id: next.userId,
    email: next.email,
    fullName: next.fullName,
    role: next.role,
  }
}

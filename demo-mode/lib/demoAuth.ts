import {
  DEMO_USERS,
  findDemoUser,
  findDemoUserById,
  type DemoRole,
  type DemoUser,
} from '@/lib/demoUsers'

export const DEMO_SESSION_KEY = 'demo:accounting-ledger:session'

export type DemoSession = {
  userId: string
  email: string
  fullName: string
  role: DemoRole
}

export type DemoAuthUser = {
  id: string
  email: string
  fullName: string
  role: DemoRole
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

export function getDemoSession(): DemoSession | null {
  return readSessionRaw()
}

export function getDemoUser(): DemoAuthUser | null {
  const session = readSessionRaw()
  if (!session) return null
  const fixed = findDemoUserById(session.userId)
  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName || fixed?.fullName || '',
    role: session.role || fixed?.role || 'viewer',
  }
}

export function requireDemoUser(): DemoAuthUser {
  const user = getDemoUser()
  if (!user) throw new Error('Unauthorized. Please sign in.')
  return user
}

export function signInDemo(email: string, password: string): DemoAuthUser {
  const matched = findDemoUser(email, password)
  if (!matched) {
    throw new Error('Invalid email or password.')
  }
  const session: DemoSession = {
    userId: matched.id,
    email: matched.email,
    fullName: matched.fullName,
    role: matched.role,
  }
  writeSession(session)
  return {
    id: matched.id,
    email: matched.email,
    fullName: matched.fullName,
    role: matched.role,
  }
}

export function signInDemoAccount(user: DemoUser): DemoAuthUser {
  return signInDemo(user.email, user.password)
}

export function signOutDemo(): void {
  writeSession(null)
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

/**
 * Demo password change is local-only (session UX). Fixed DEMO_USERS passwords
 * remain the way to sign in from the login cards; this validates current password
 * and confirms the Change Password form flow.
 */
export function updateDemoPassword(currentPassword: string, _newPassword: string): void {
  const session = readSessionRaw()
  if (!session) throw new Error('Unauthorized. Please sign in.')
  if (!String(currentPassword || '').trim()) {
    throw new Error('Current password is required.')
  }
  const matched = findDemoUser(session.email, currentPassword)
  if (!matched) {
    throw new Error('Current password is incorrect.')
  }
}

const DEMO_RESET_KEY = 'demo:accounting-ledger:password-reset'

/** Marks that the demo Forgot Password flow reached the reset step. */
export function markDemoPasswordReset(email: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(
    DEMO_RESET_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), at: Date.now() })
  )
}

export function consumeDemoPasswordReset(): { email: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(DEMO_RESET_KEY)
    if (!raw) return null
    sessionStorage.removeItem(DEMO_RESET_KEY)
    const parsed = JSON.parse(raw) as { email?: string }
    if (!parsed?.email) return null
    return { email: parsed.email }
  } catch {
    return null
  }
}

/** Completes demo reset UX without changing fixed DEMO_USERS passwords. */
export function completeDemoPasswordReset(email: string, newPassword: string): void {
  if (!email.trim()) throw new Error('Email is required.')
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  // Fixed demo credentials stay on login cards — success confirms the production-shaped flow.
}

export function listDemoLoginCards(): Array<{
  user: DemoUser
  label: string
  description: string
}> {
  return DEMO_USERS.map((user) => {
    if (user.role === 'admin') {
      return {
        user,
        label: 'Admin',
        description: 'Full access to settings, types, and ledger data.',
      }
    }
    if (user.role === 'editor') {
      return {
        user,
        label: 'Editor',
        description: 'Day-to-day books: accounts, transactions, and expenses.',
      }
    }
    return {
      user,
      label: 'Viewer',
      description: 'Browse dashboards and ledgers in a read-oriented sandbox.',
    }
  })
}

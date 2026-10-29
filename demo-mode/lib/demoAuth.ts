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

/** Demo password change is local-only (session UX); passwords stay on DEMO_USERS. */
export function updateDemoPassword(_newPassword: string): void {
  const session = readSessionRaw()
  if (!session) throw new Error('Unauthorized. Please sign in.')
  // Intentionally no-op for fixed demo credentials — confirm UX success only.
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

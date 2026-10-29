export type DemoRole = 'admin' | 'editor' | 'viewer'

export type DemoUser = {
  id: string
  email: string
  password: string
  fullName: string
  role: DemoRole
}

/** Fixed demo accounts — shown on the login page; never put passwords in demo.json. */
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'user-admin',
    email: 'admin@admin.com',
    password: 'admin123',
    fullName: 'Ayesha Khan',
    role: 'admin',
  },
  {
    id: 'user-editor',
    email: 'editor@demo.com',
    password: 'demo123',
    fullName: 'Hassan Malik',
    role: 'editor',
  },
  {
    id: 'user-viewer',
    email: 'viewer@demo.com',
    password: 'view123',
    fullName: 'Sara Ahmed',
    role: 'viewer',
  },
]

export function findDemoUser(
  email: string,
  password: string
): DemoUser | null {
  const normalized = email.trim().toLowerCase()
  const user = DEMO_USERS.find((u) => u.email.toLowerCase() === normalized)
  if (!user || user.password !== password) return null
  return user
}

export function findDemoUserById(id: string): DemoUser | null {
  return DEMO_USERS.find((u) => u.id === id) ?? null
}

export function roleLabel(role: DemoRole): string {
  if (role === 'admin') return 'Admin'
  if (role === 'editor') return 'Editor'
  return 'Viewer'
}

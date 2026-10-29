import { getDemoUser, type DemoAuthUser } from '@/lib/demoAuth'

/** Demo Mode: require a logged-in demo session (no Supabase). */
export async function requireUser(): Promise<
  { user: DemoAuthUser; error?: undefined } | { user?: undefined; error: { status: number; message: string } }
> {
  const user = getDemoUser()
  if (!user) {
    return { error: { status: 401, message: 'Unauthorized. Please sign in.' } }
  }
  return { user }
}

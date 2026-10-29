import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/** Require a logged-in Supabase Auth user (API routes). */
export async function requireUser(): Promise<
  { user: User; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) {
      return {
        error: NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 }),
      }
    }
    return { user }
  } catch {
    return {
      error: NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 }),
    }
  }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _admin: SupabaseClient | null = null

/** Server-only Supabase client with service role. Throws when env is missing (only when first used). */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (use server-side only)')
  }
  _admin = createClient(supabaseUrl, serviceRoleKey)
  return _admin
}

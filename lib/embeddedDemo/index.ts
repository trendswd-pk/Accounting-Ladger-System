import { clearClientSessionCaches } from '@/lib/clearClientSessionCaches'
import { ensureDemoSeeded } from '@/lib/embeddedDemo/seed'
import {
  beginEmbeddedDemoSession,
  DEMO_GUEST_USER_ID,
  endEmbeddedDemoSession,
  isEmbeddedDemoActive,
} from '@/lib/embeddedDemo/session'
import { clearDemoUserData } from '@/lib/embeddedDemo/store'

export {
  isEmbeddedDemoActive,
  getDemoUser,
  getDemoSession,
  DEMO_COOKIE,
} from '@/lib/embeddedDemo/session'

/**
 * Activate localStorage-backed demo: seed Northline sample ledger, set cookie
 * for middleware, clear any prior in-memory real-user caches.
 */
export async function enterEmbeddedDemoMode(): Promise<void> {
  clearClientSessionCaches()
  beginEmbeddedDemoSession()
  ensureDemoSeeded(DEMO_GUEST_USER_ID)
  // Warm settings/accounts caches via main entry points (demo-branched).
  const { invalidateAppSettingsCache, fetchAppSettings } = await import('@/lib/appSettings')
  invalidateAppSettingsCache()
  await fetchAppSettings().catch(() => undefined)
  const { fetchAccounts } = await import('@/lib/accounts')
  await fetchAccounts({ force: true }).catch(() => undefined)
  const { fetchTransactions } = await import('@/lib/transactions')
  await fetchTransactions({ force: true }).catch(() => undefined)
}

/**
 * Leave demo: drop cookie + localStorage session (ledger seed keys optional wipe).
 * Does not touch Supabase.
 */
export function exitEmbeddedDemoMode(options?: { wipeData?: boolean }): void {
  if (options?.wipeData) {
    clearDemoUserData(DEMO_GUEST_USER_ID)
  }
  endEmbeddedDemoSession()
  clearClientSessionCaches()
}

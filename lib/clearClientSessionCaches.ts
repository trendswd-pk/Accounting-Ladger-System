import { invalidateAccountsCache } from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  invalidateAppSettingsCache,
  notifyAppSettingsReset,
} from '@/lib/appSettings'
import { invalidateBanksCache } from '@/lib/banks'
import { invalidateDashboardExpenseSummaryCache } from '@/lib/dashboardExpenseSummary'
import { invalidateSetupTypesCache } from '@/lib/setupTypes'
import { invalidateTransactionsCache } from '@/lib/transactions'
import { invalidateUploadedFilesCache } from '@/lib/uploads'

/**
 * Drop all in-memory ledger caches for the previous signed-in user.
 * Call on logout and again after login/signup before navigating into the app
 * so Soft Navigation does not reuse the prior user's accounts/settings.
 */
export function clearClientSessionCaches(): void {
  invalidateAppSettingsCache()
  // Do not broadcast the product default "Trends WD" — that sticks in the header
  // until a hard reload if the next settings fetch is slow/skipped.
  notifyAppSettingsReset({
    ...DEFAULT_APP_SETTINGS,
    businessName: '',
    logoUrl: null,
  })
  invalidateAccountsCache()
  invalidateTransactionsCache()
  invalidateBanksCache()
  invalidateSetupTypesCache()
  invalidateUploadedFilesCache()
  invalidateDashboardExpenseSummaryCache()
}

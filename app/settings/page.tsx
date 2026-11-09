'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { SettingsNavRow } from '@/components/settings/SettingsShared'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  getCachedAppSettings,
  type AppSettings,
} from '@/lib/appSettings'
import { DASHBOARD_EXPENSE_PERIOD_OPTIONS } from '@/lib/dashboardExpensePeriod'
import { LEDGER_SHARE_TTL_OPTIONS } from '@/lib/ledgerShareCrypto'

export default function SettingsPage() {
  const [infoOpen, setInfoOpen] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(
    () => getCachedAppSettings() ?? DEFAULT_APP_SETTINGS
  )
  const [loading, setLoading] = useState(() => getCachedAppSettings() == null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await fetchAppSettings()
        if (!cancelled) setSettings(next)
      } catch {
        /* hub still shows defaults */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const businessValue = [
    settings.businessName,
    settings.currency,
    settings.theme === 'dark' ? 'Dark' : 'Light',
  ]
    .filter(Boolean)
    .join(' · ')

  const expenseLabel =
    DASHBOARD_EXPENSE_PERIOD_OPTIONS.find((o) => o.id === settings.dashboardExpensePeriod)
      ?.label ?? settings.dashboardExpensePeriod

  const transactionsValue = [
    settings.defaultEntryMode === 'transfer'
      ? 'Transfer'
      : settings.defaultEntryMode === 'multi'
        ? 'Multi Transaction'
        : 'Normal Entry',
    settings.floatingActionsShowLabels ? 'Labels on' : 'Labels off',
  ].join(' · ')

  const messagesValue = `${settings.ledgerShareRequirePin ? 'PIN on' : 'PIN off'} · ${
    LEDGER_SHARE_TTL_OPTIONS.find((o) => o.hours === settings.ledgerShareTtlHours)?.label ??
    `${settings.ledgerShareTtlHours}h`
  }`

  return (
    <div className={`w-full p-4 lg:p-8 ${loading ? 'opacity-70' : ''}`}>
      <div className="mb-4 flex min-w-0 items-center gap-2 lg:mb-6">
        <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              infoOpen
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
            }`}
            aria-label="About Settings"
            aria-expanded={infoOpen}
          >
            <Info className="h-5 w-5" aria-hidden />
          </button>
          {infoOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setInfoOpen(false)}
                aria-hidden
              />
              <div
                role="dialog"
                className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                Settings are grouped by area. Open a row to edit that group; Save
                returns here.
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
        <SettingsNavRow
          href="/settings/business"
          label="Business"
          description="Name, logo, favicon, currency, and theme."
          value={businessValue}
        />
        <SettingsNavRow
          href="/settings/dashboard"
          label="Dashboard"
          description="Cash & Savings, Payable & Receivable filters, and Expenses period."
          value={expenseLabel}
        />
        <SettingsNavRow
          href="/settings/transactions"
          label="Transactions"
          description="Default entry mode, floating action labels, and CSV import / export."
          value={transactionsValue}
        />
        <SettingsNavRow
          href="/settings/accounts"
          label="Accounts"
          description="CSV template, import, and export for accounts."
        />
        <SettingsNavRow
          href="/settings/messages"
          label="Messages"
          description="WhatsApp templates and ledger preview link (PIN / expiry)."
          value={messagesValue}
        />
      </div>
    </div>
  )
}

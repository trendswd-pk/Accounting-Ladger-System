'use client'

import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import {
  defaultCashSavingsAccountTypeIds,
  defaultCashSavingsCashTypeIds,
} from '@/lib/accountFilters'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  fetchSetupTypes,
  getCachedSetupTypes,
  type SetupTypeRecord,
} from '@/lib/setupTypes'
import {
  applyThemePreference,
  getDefaultTheme,
  type ThemePreference,
} from '@/lib/theme'

const inputClass =
  'w-full sm:w-72 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 dark:border-gray-700">
      <div className="min-w-0 flex-1 text-left sm:max-w-sm lg:max-w-md">
        {htmlFor ? (
          <label
            htmlFor={htmlFor}
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            {label}
          </label>
        ) : (
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </span>
        )}
        {description ? (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      <div className="flex w-full shrink-0 justify-end sm:w-auto sm:min-w-[14rem] sm:max-w-md">
        {children}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(DEFAULT_APP_SETTINGS.businessName)
  const [currency, setCurrency] = useState(DEFAULT_APP_SETTINGS.currency)
  const [theme, setTheme] = useState<ThemePreference>(getDefaultTheme())
  const [defaultEntryMode, setDefaultEntryMode] = useState<DefaultEntryMode>(
    DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [cashSavingsCashTypeIds, setCashSavingsCashTypeIds] = useState<string[]>(
    () => DEFAULT_APP_SETTINGS.cashSavingsCashTypeIds
  )
  const [cashSavingsAccountTypeIds, setCashSavingsAccountTypeIds] = useState<string[]>(
    () => DEFAULT_APP_SETTINGS.cashSavingsAccountTypeIds
  )
  const [cashTypes, setCashTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('cash-types') ?? []).filter((t) => t.active)
  )
  const [accountTypes, setAccountTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('account-types') ?? []).filter((t) => t.active)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [settings, cashTypeRows, accountTypeRows] = await Promise.all([
          fetchAppSettings(),
          fetchSetupTypes('cash-types'),
          fetchSetupTypes('account-types'),
        ])
        if (cancelled) return
        const activeCashTypes = cashTypeRows.filter((t) => t.active)
        const activeAccountTypes = accountTypeRows.filter((t) => t.active)
        setCashTypes(activeCashTypes)
        setAccountTypes(activeAccountTypes)
        setBusinessName(settings.businessName)
        setCurrency(settings.currency)
        setTheme(settings.theme)
        setDefaultEntryMode(settings.defaultEntryMode)
        applyThemePreference(settings.theme)

        const savedCashIds = settings.cashSavingsCashTypeIds.filter((id) =>
          activeCashTypes.some((t) => t.id === id)
        )
        const savedAccountIds = settings.cashSavingsAccountTypeIds.filter((id) =>
          activeAccountTypes.some((t) => t.id === id)
        )
        const hasAnySaved = savedCashIds.length > 0 || savedAccountIds.length > 0
        setCashSavingsCashTypeIds(
          hasAnySaved
            ? savedCashIds
            : defaultCashSavingsCashTypeIds(activeCashTypes)
        )
        setCashSavingsAccountTypeIds(
          hasAnySaved
            ? savedAccountIds
            : defaultCashSavingsAccountTypeIds(activeAccountTypes)
        )
      } catch (err) {
        if (cancelled) return
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load settings from Supabase.',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const name = businessName.trim()
    if (!name) {
      setMessage({ type: 'error', text: 'Business name is required.' })
      return
    }
    if (
      cashSavingsCashTypeIds.length === 0 &&
      cashSavingsAccountTypeIds.length === 0
    ) {
      setMessage({
        type: 'error',
        text: 'Select at least one Account Type or Cash Type for Cash & Savings.',
      })
      return
    }
    setSaving(true)
    try {
      const saved = await saveAppSettings({
        businessName: name,
        currency,
        theme,
        defaultEntryMode,
        cashSavingsCashTypeIds,
        cashSavingsAccountTypeIds,
      })
      setBusinessName(saved.businessName)
      setCurrency(saved.currency)
      setTheme(saved.theme)
      setDefaultEntryMode(saved.defaultEntryMode)
      setCashSavingsCashTypeIds(saved.cashSavingsCashTypeIds)
      setCashSavingsAccountTypeIds(saved.cashSavingsAccountTypeIds)
      applyThemePreference(saved.theme)
      setMessage({ type: 'success', text: 'Settings saved to Supabase.' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save settings.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <form
        onSubmit={(e) => void handleSave(e)}
        className={loading ? 'opacity-70 pointer-events-none' : ''}
      >
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
          <div className="flex min-w-0 items-center gap-2">
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
                aria-controls="settings-info-popover"
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
                    id="settings-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Business profile and display preferences — stored in Supabase.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
          <SettingRow
            label="Business name"
            description="Shown in the sidebar and header."
            htmlFor="businessName"
          >
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
              placeholder="Your company name"
              autoComplete="organization"
            />
          </SettingRow>

          <SettingRow
            label="Default currency"
            description="Used for balances and amounts across the app."
            htmlFor="currency"
          >
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </SettingRow>

          <SettingRow label="Theme" description="App appearance preference.">
            <div className="flex flex-wrap justify-end gap-2">
              {(['light', 'dark'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setTheme(option)
                    applyThemePreference(option)
                  }}
                  className={`rounded-md border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    theme === option
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Default transaction entry mode"
            description="Pre-selected when you open Add Transaction. You can still switch on the form."
          >
            <div className="flex flex-wrap justify-end gap-2">
              {(
                [
                  { id: 'normal' as const, label: 'Normal Entry' },
                  { id: 'transfer' as const, label: 'Transfer' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDefaultEntryMode(option.id)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    defaultEntryMode === option.id
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Cash & Savings"
            description="Accounts matching the selected Account Type and Cash Type filters are totaled on the dashboard card and Cash & Savings page."
          >
            <div className="flex w-full max-w-md flex-col items-end gap-3">
              <MultiSelectDropdown
                id="cashSavingsAccountTypes"
                label="Account Type"
                values={cashSavingsAccountTypeIds}
                onChange={setCashSavingsAccountTypeIds}
                options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select account types…"
                emptyMessage="No active Account Types"
              />
              <MultiSelectDropdown
                id="cashSavingsCashTypes"
                label="Cash Type"
                values={cashSavingsCashTypeIds}
                onChange={setCashSavingsCashTypeIds}
                options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select cash types…"
                emptyMessage="No active Cash Types"
              />
            </div>
          </SettingRow>
        </div>

        {message ? (
          <p
            className={`mt-4 text-sm ${
              message.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}
      </form>
    </div>
  )
}

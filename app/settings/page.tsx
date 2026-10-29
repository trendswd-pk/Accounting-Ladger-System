'use client'

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import {
  defaultCashSavingsAccountTypeIds,
  defaultCashSavingsCashTypeIds,
  defaultLoanAccountTypeIds,
} from '@/lib/accountFilters'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  downloadAccountImportTemplate,
  downloadTransactionImportTemplate,
  exportAccountsCsv,
  exportTransactionsCsv,
  importAccountsFromCsvFile,
  importTransactionsFromCsvFile,
  type ImportProgress,
} from '@/lib/dataImportExport'
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

const actionBtnClass =
  'inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

const primaryActionBtnClass =
  'inline-flex h-9 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

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
  const [hintOpen, setHintOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 dark:border-gray-700">
      <div className="min-w-0 flex-1 text-left sm:max-w-sm lg:max-w-md">
        <div className="flex items-center gap-1.5">
          {htmlFor ? (
            <label
              htmlFor={htmlFor}
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {label}
            </label>
          ) : (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {label}
            </span>
          )}
          {description ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  hintOpen
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
                }`}
                aria-label={`About ${label}`}
                aria-expanded={hintOpen}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
              {hintOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setHintOpen(false)}
                    aria-hidden
                  />
                  <div
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-1.5 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {description}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex w-full shrink-0 justify-end sm:w-auto sm:min-w-[14rem] sm:max-w-xl">
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
  const [payableReceivableCashTypeIds, setPayableReceivableCashTypeIds] = useState<
    string[]
  >(() => DEFAULT_APP_SETTINGS.payableReceivableCashTypeIds)
  const [payableReceivableAccountTypeIds, setPayableReceivableAccountTypeIds] =
    useState<string[]>(() => DEFAULT_APP_SETTINGS.payableReceivableAccountTypeIds)
  const [cashTypes, setCashTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('cash-types') ?? []).filter((t) => t.active)
  )
  const [accountTypes, setAccountTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('account-types') ?? []).filter((t) => t.active)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importingAccounts, setImportingAccounts] = useState(false)
  const [exportingAccounts, setExportingAccounts] = useState(false)
  const [importingTransactions, setImportingTransactions] = useState(false)
  const [exportingTransactions, setExportingTransactions] = useState(false)
  const [accountImportProgress, setAccountImportProgress] = useState<ImportProgress | null>(
    null
  )
  const [transactionImportProgress, setTransactionImportProgress] =
    useState<ImportProgress | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const accountFileRef = useRef<HTMLInputElement | null>(null)
  const transactionFileRef = useRef<HTMLInputElement | null>(null)

  const renderImportProgress = (progress: ImportProgress | null) => {
    if (!progress) return null
    return (
      <div className="mt-2 w-full min-w-[12rem] sm:w-72">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span>
            {progress.processed}/{progress.total} rows · imported {progress.imported}
          </span>
          <span className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">
            {progress.percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-primary-600 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>
      </div>
    )
  }

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

        const pickSavedOrDefault = (
          savedCash: string[],
          savedAccount: string[],
          defaultCash: string[],
          defaultAccount: string[]
        ) => {
          const cash = savedCash.filter((id) =>
            activeCashTypes.some((t) => t.id === id)
          )
          const account = savedAccount.filter((id) =>
            activeAccountTypes.some((t) => t.id === id)
          )
          const hasAny = cash.length > 0 || account.length > 0
          return {
            cash: hasAny ? cash : defaultCash,
            account: hasAny ? account : defaultAccount,
          }
        }

        const cashSavings = pickSavedOrDefault(
          settings.cashSavingsCashTypeIds,
          settings.cashSavingsAccountTypeIds,
          defaultCashSavingsCashTypeIds(activeCashTypes),
          defaultCashSavingsAccountTypeIds(activeAccountTypes)
        )
        setCashSavingsCashTypeIds(cashSavings.cash)
        setCashSavingsAccountTypeIds(cashSavings.account)

        const payableReceivable = pickSavedOrDefault(
          settings.payableReceivableCashTypeIds,
          settings.payableReceivableAccountTypeIds,
          [],
          defaultLoanAccountTypeIds(activeAccountTypes)
        )
        setPayableReceivableCashTypeIds(payableReceivable.cash)
        setPayableReceivableAccountTypeIds(payableReceivable.account)
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
    if (
      payableReceivableCashTypeIds.length === 0 &&
      payableReceivableAccountTypeIds.length === 0
    ) {
      setMessage({
        type: 'error',
        text: 'Select at least one Account Type or Cash Type for Payable & Receivable.',
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
        payableReceivableCashTypeIds,
        payableReceivableAccountTypeIds,
      })
      setBusinessName(saved.businessName)
      setCurrency(saved.currency)
      setTheme(saved.theme)
      setDefaultEntryMode(saved.defaultEntryMode)
      setCashSavingsCashTypeIds(saved.cashSavingsCashTypeIds)
      setCashSavingsAccountTypeIds(saved.cashSavingsAccountTypeIds)
      setPayableReceivableCashTypeIds(saved.payableReceivableCashTypeIds)
      setPayableReceivableAccountTypeIds(saved.payableReceivableAccountTypeIds)
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

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
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
            description="Accounts that match any selected Account Type or Cash Type are totaled on the dashboard card and Cash & Savings page."
          >
            <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:w-[28rem]">
              <MultiSelectDropdown
                id="cashSavingsAccountTypes"
                label="Account Type"
                values={cashSavingsAccountTypeIds}
                onChange={setCashSavingsAccountTypeIds}
                options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Account Types"
              />
              <MultiSelectDropdown
                id="cashSavingsCashTypes"
                label="Cash Type"
                values={cashSavingsCashTypeIds}
                onChange={setCashSavingsCashTypeIds}
                options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Cash Types"
              />
            </div>
          </SettingRow>

          <SettingRow
            label="Payable & Receivable"
            description="Matching accounts are split by balance: minus → Payable, plus → Receivable on the dashboard cards and pages."
          >
            <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:w-[28rem]">
              <MultiSelectDropdown
                id="payableReceivableAccountTypes"
                label="Account Type"
                values={payableReceivableAccountTypeIds}
                onChange={setPayableReceivableAccountTypeIds}
                options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Account Types"
              />
              <MultiSelectDropdown
                id="payableReceivableCashTypes"
                label="Cash Type"
                values={payableReceivableCashTypeIds}
                onChange={setPayableReceivableCashTypeIds}
                options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Cash Types"
              />
            </div>
          </SettingRow>

          <SettingRow
            label="Account import & export"
            description="Import CSV: name, phone, account_type, cash_type. Export includes current balance. Types match by name or code; duplicate names are skipped on import."
          >
            <div className="flex w-full flex-col items-end gap-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  ref={accountFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setMessage(null)
                    setImportingAccounts(true)
                    setAccountImportProgress({
                      percent: 0,
                      processed: 0,
                      total: 0,
                      imported: 0,
                      skipped: 0,
                      errorCount: 0,
                    })
                    void importAccountsFromCsvFile(file, setAccountImportProgress)
                      .then((result) => {
                        const extra =
                          result.errorCount > 0
                            ? ` ${result.errorCount} row error(s).`
                            : ''
                        setMessage({
                          type:
                            result.imported > 0 || result.errorCount === 0
                              ? 'success'
                              : 'error',
                          text: `Accounts: imported ${result.imported}, skipped ${result.skipped}.${extra}`,
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text: err instanceof Error ? err.message : 'Account import failed.',
                        })
                      })
                      .finally(() => {
                        setImportingAccounts(false)
                        setAccountImportProgress(null)
                      })
                  }}
                />
                <button
                  type="button"
                  className={actionBtnClass}
                  onClick={() => downloadAccountImportTemplate()}
                >
                  Template
                </button>
                <button
                  type="button"
                  className={actionBtnClass}
                  disabled={exportingAccounts || loading || importingAccounts}
                  onClick={() => {
                    setMessage(null)
                    setExportingAccounts(true)
                    void exportAccountsCsv()
                      .then(() => {
                        setMessage({
                          type: 'success',
                          text: 'Accounts exported to CSV (with current balance).',
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text:
                            err instanceof Error ? err.message : 'Account export failed.',
                        })
                      })
                      .finally(() => setExportingAccounts(false))
                  }}
                >
                  {exportingAccounts ? 'Exporting…' : 'Export'}
                </button>
                <button
                  type="button"
                  className={primaryActionBtnClass}
                  disabled={importingAccounts || loading}
                  onClick={() => accountFileRef.current?.click()}
                >
                  {importingAccounts
                    ? `Importing ${accountImportProgress?.percent ?? 0}%`
                    : 'Import CSV'}
                </button>
              </div>
              {renderImportProgress(accountImportProgress)}
            </div>
          </SettingRow>

          <SettingRow
            label="Transaction import & export"
            description="CSV columns: transaction_date (YYYY-MM-DD), account_name, narration, entry_type (credit/debit), amount. Import matches accounts by name."
          >
            <div className="flex w-full flex-col items-end gap-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  ref={transactionFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setMessage(null)
                    setImportingTransactions(true)
                    setTransactionImportProgress({
                      percent: 0,
                      processed: 0,
                      total: 0,
                      imported: 0,
                      skipped: 0,
                      errorCount: 0,
                    })
                    void importTransactionsFromCsvFile(file, setTransactionImportProgress)
                      .then((result) => {
                        const extra =
                          result.errorCount > 0
                            ? ` ${result.errorCount} row error(s).`
                            : ''
                        setMessage({
                          type:
                            result.imported > 0 || result.errorCount === 0
                              ? 'success'
                              : 'error',
                          text: `Transactions: imported ${result.imported}, skipped ${result.skipped}.${extra}`,
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text:
                            err instanceof Error
                              ? err.message
                              : 'Transaction import failed.',
                        })
                      })
                      .finally(() => {
                        setImportingTransactions(false)
                        setTransactionImportProgress(null)
                      })
                  }}
                />
                <button
                  type="button"
                  className={actionBtnClass}
                  onClick={() => downloadTransactionImportTemplate()}
                >
                  Template
                </button>
                <button
                  type="button"
                  className={actionBtnClass}
                  disabled={exportingTransactions || loading || importingTransactions}
                  onClick={() => {
                    setMessage(null)
                    setExportingTransactions(true)
                    void exportTransactionsCsv()
                      .then(() => {
                        setMessage({
                          type: 'success',
                          text: 'Transactions exported to CSV.',
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text:
                            err instanceof Error
                              ? err.message
                              : 'Transaction export failed.',
                        })
                      })
                      .finally(() => setExportingTransactions(false))
                  }}
                >
                  {exportingTransactions ? 'Exporting…' : 'Export'}
                </button>
                <button
                  type="button"
                  className={primaryActionBtnClass}
                  disabled={importingTransactions || loading}
                  onClick={() => transactionFileRef.current?.click()}
                >
                  {importingTransactions
                    ? `Importing ${transactionImportProgress?.percent ?? 0}%`
                    : 'Import CSV'}
                </button>
              </div>
              {renderImportProgress(transactionImportProgress)}
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

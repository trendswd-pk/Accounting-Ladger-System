'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  actionBtnClass,
  primaryActionBtnClass,
  SettingRow,
  SettingsDetailShell,
} from '@/components/settings/SettingsShared'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  downloadTransactionImportTemplate,
  exportTransactionsCsv,
  importTransactionsFromCsvFile,
  type ImportProgress,
} from '@/lib/dataImportExport'

export default function TransactionsSettingsPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [defaultEntryMode, setDefaultEntryMode] = useState<DefaultEntryMode>(
    DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [floatingActionsShowLabels, setFloatingActionsShowLabels] = useState(
    DEFAULT_APP_SETTINGS.floatingActionsShowLabels
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const s = await fetchAppSettings()
        if (cancelled) return
        setDefaultEntryMode(s.defaultEntryMode)
        setFloatingActionsShowLabels(s.floatingActionsShowLabels)
      } catch (err) {
        if (!cancelled) {
          setMessage({
            type: 'error',
            text: err instanceof Error ? err.message : 'Failed to load settings.',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await saveAppSettings({ defaultEntryMode, floatingActionsShowLabels })
      router.push('/settings')
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
    <SettingsDetailShell
      title="Transactions"
      info="Defaults for Add Transaction, floating action labels, and CSV import / export."
      saving={saving || loading}
      onSave={handleSave}
      message={message}
    >
      <div
        className={`rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90 ${
          loading ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        <SettingRow
          label="Default transaction entry mode"
          description="Pre-selected when you open Add Transaction. You can still switch on the form."
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
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
          label="Floating action labels"
          description="Show text labels next to icons when a floating Actions button is open. Off by default (icons only)."
          inline
        >
          <button
            type="button"
            role="switch"
            aria-checked={floatingActionsShowLabels}
            aria-label={
              floatingActionsShowLabels
                ? 'Floating action labels shown'
                : 'Floating action labels hidden'
            }
            disabled={saving || loading}
            onClick={() => setFloatingActionsShowLabels((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 ${
              floatingActionsShowLabels
                ? 'bg-primary-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                floatingActionsShowLabels ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </SettingRow>

        <SettingRow
          label="Transaction import & export"
          description="CSV columns: transaction_date (YYYY-MM-DD), account_name, narration, entry_type (credit/debit), amount. Import matches accounts by name."
        >
          <div className="flex w-full flex-col items-center gap-1 sm:items-end">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setMessage(null)
                  setImporting(true)
                  setProgress({
                    percent: 0,
                    processed: 0,
                    total: 0,
                    imported: 0,
                    skipped: 0,
                    errorCount: 0,
                  })
                  void importTransactionsFromCsvFile(file, setProgress)
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
                      setImporting(false)
                      setProgress(null)
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
                disabled={exporting || importing || loading}
                onClick={() => {
                  setMessage(null)
                  setExporting(true)
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
                    .finally(() => setExporting(false))
                }}
              >
                {exporting ? 'Exporting…' : 'Export'}
              </button>
              <button
                type="button"
                className={primaryActionBtnClass}
                disabled={importing || loading}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? `Importing ${progress?.percent ?? 0}%` : 'Import CSV'}
              </button>
            </div>
            {progress ? (
              <div className="mt-2 w-full min-w-[12rem] sm:w-72">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <span>
                    {progress.processed}/{progress.total} rows · imported{' '}
                    {progress.imported}
                  </span>
                  <span className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">
                    {progress.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-[width] duration-200 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress.percent))}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </SettingRow>
      </div>
    </SettingsDetailShell>
  )
}

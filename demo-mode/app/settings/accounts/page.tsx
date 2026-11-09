'use client'

import { useRef, useState } from 'react'
import {
  actionBtnClass,
  primaryActionBtnClass,
  SettingRow,
  SettingsDetailShell,
} from '@/components/settings/SettingsShared'
import {
  downloadAccountImportTemplate,
  exportAccountsCsv,
  importAccountsFromCsvFile,
  type ImportProgress,
} from '@/lib/dataImportExport'

export default function AccountsSettingsPage() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  return (
    <SettingsDetailShell
      title="Accounts"
      info="Import CSV, export all accounts, or download a template. Types match by name or code."
      showSave={false}
      message={message}
    >
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
        <SettingRow
          label="Account import & export"
          description="Import CSV: name, phone, account_type, cash_type. Export includes current balance. Types match by name or code; duplicate names are skipped on import."
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
                  void importAccountsFromCsvFile(file, setProgress)
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
                        text:
                          err instanceof Error ? err.message : 'Account import failed.',
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
                onClick={() => downloadAccountImportTemplate()}
              >
                Template
              </button>
              <button
                type="button"
                className={actionBtnClass}
                disabled={exporting || importing}
                onClick={() => {
                  setMessage(null)
                  setExporting(true)
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
                    .finally(() => setExporting(false))
                }}
              >
                {exporting ? 'Exporting…' : 'Export'}
              </button>
              <button
                type="button"
                className={primaryActionBtnClass}
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? `Importing ${progress?.percent ?? 0}%` : 'Import CSV'}
              </button>
            </div>
            {progress ? (
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

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchAccounts, getCachedAccounts } from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'
import {
  fetchTransactions,
  getCachedTransactions,
  signedTransactionAmount,
  type TransactionRecord,
} from '@/lib/transactions'
import { leaveTransactionPrintPreview } from '@/lib/transactionPrint'

type Status = 'loading' | 'ready' | 'error'

function runningBalanceFor(
  rows: TransactionRecord[],
  txn: TransactionRecord
): number {
  const list = rows
    .filter((r) => r.accountId === txn.accountId)
    .slice()
    .sort((a, b) => {
      const byDate = a.transactionDate.localeCompare(b.transactionDate)
      if (byDate !== 0) return byDate
      return a.entryNumber - b.entryNumber
    })
  let running = 0
  for (const row of list) {
    running += signedTransactionAmount(row)
    if (row.id === txn.id) return running
  }
  return signedTransactionAmount(txn)
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Print / preview mode for a single transaction.
 * URL: /transactions/{id}/print
 */
export default function TransactionPrintPage() {
  const params = useParams()
  const id = String(params?.id ?? '').trim()

  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [entryLabel, setEntryLabel] = useState('')
  const [filename, setFilename] = useState('voucher.pdf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)

  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [businessName, setBusinessName] = useState(
    () =>
      getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => getCachedAppSettings()?.logoUrl ?? null
  )

  useEffect(() => {
    return watchAppSettings((s) => {
      setCurrency(s.currency)
      setBusinessName(s.businessName)
      setLogoUrl(s.logoUrl)
    })
  }, [])

  useEffect(() => {
    if (!id) {
      setStatus('error')
      setError('Missing transaction id.')
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    void (async () => {
      setStatus('loading')
      setError(null)
      try {
        const [txns, accounts] = await Promise.all([
          getCachedTransactions()
            ? Promise.resolve(getCachedTransactions()!)
            : fetchTransactions(),
          getCachedAccounts()
            ? Promise.resolve(getCachedAccounts()!)
            : fetchAccounts(),
        ])
        // Prefer fresh lists so running balance / account name stay accurate.
        const [freshTxns, freshAccounts] = await Promise.all([
          fetchTransactions({ force: true }).catch(() => txns),
          fetchAccounts({ force: true }).catch(() => accounts),
        ])
        if (cancelled) return

        const txn = freshTxns.find((r) => r.id === id)
        if (!txn) {
          setStatus('error')
          setError('Transaction not found.')
          return
        }

        setEntryLabel(`Entry ${txn.entryNumber}`)
        const account =
          freshAccounts.find((a) => a.id === txn.accountId) ?? null
        const runningBalance = runningBalanceFor(freshTxns, txn)

        const { buildTransactionPdfBlob } = await import(
          '@/lib/transactionExport'
        )
        const built = await buildTransactionPdfBlob(txn, {
          currency,
          businessName,
          logoUrl,
          account,
          runningBalance,
        })
        if (cancelled) return

        objectUrl = URL.createObjectURL(built.blob)
        setBlob(built.blob)
        setFilename(built.filename)
        setPdfUrl(objectUrl)
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(
          err instanceof Error ? err.message : 'Could not prepare print preview.'
        )
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, currency, businessName, logoUrl])

  const title = useMemo(
    () =>
      entryLabel
        ? `Print preview · ${entryLabel}`
        : 'Print preview · Accounting Ledger',
    [entryLabel]
  )

  useEffect(() => {
    document.title = title
  }, [title])

  const handlePrint = () => {
    const frame = document.getElementById(
      'txn-print-frame'
    ) as HTMLIFrameElement | null
    try {
      if (frame?.contentWindow) {
        frame.contentWindow.focus()
        frame.contentWindow.print()
        return
      }
    } catch {
      /* fall through */
    }
    window.print()
  }

  const handleDownload = () => {
    if (!blob) return
    downloadBlob(filename, blob)
  }

  return (
    <div className="flex h-screen flex-col bg-brand-antiFlash text-brand-ink">
      <header className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-brand-pistachio bg-white px-4 py-3 print:hidden">
        <div className="mr-auto text-sm font-bold tracking-tight">
          Accounting Ledger
        </div>
        <div className="max-w-[40vw] truncate text-xs text-brand-stone">
          {status === 'ready' ? filename : entryLabel || 'Preparing preview…'}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={status !== 'ready'}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-brand-pistachio bg-primary-50 px-3.5 text-sm font-semibold text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={status !== 'ready'}
            className="inline-flex h-10 items-center justify-center rounded-[10px] bg-primary-600 px-3.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => leaveTransactionPrintPreview(id)}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-brand-pistachio bg-transparent px-3.5 text-sm font-semibold text-brand-stone"
          >
            Close
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {status === 'loading' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-brand-stone">
            <div
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600"
              aria-hidden
            />
            <p>Preparing print preview…</p>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-red-700">
            {error || 'Could not prepare print preview.'}
          </div>
        ) : null}

        {status === 'ready' && pdfUrl ? (
          <iframe
            id="txn-print-frame"
            title={title}
            src={pdfUrl}
            className="h-full w-full border-0 bg-[#525659]"
          />
        ) : null}
      </main>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarRange,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Lock,
  Paperclip,
  Receipt,
  X,
} from 'lucide-react'
import TransactionMobileCard from '@/components/TransactionMobileCard'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalOverlayClass,
  formModalPanelClass,
  formModalPrimaryButtonClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import {
  exportLedgerFromLines,
  type LedgerExportFormat,
  type LedgerLine,
} from '@/lib/ledgerExport'
import {
  formatDisplayDate,
  formatDisplayDateTime,
  localYmd,
} from '@/lib/localDate'
import { formatMoney } from '@/lib/money'

type ShareMeta = {
  token: string
  accountName: string
  businessName: string
  expiresAt: string
  expired: boolean
  locked: boolean
}

type Attachment = {
  id: string
  fileName: string
  publicUrl: string
  mimeType: string
}

type Txn = {
  id: string
  entryNumber: number
  transactionDate: string
  narration: string
  entryType: 'credit' | 'debit'
  amount: number
  runningBalance: number
  attachments: Attachment[]
}

type ShareBank = {
  id: string
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string
  branchName: string
  branchCode: string
  swiftCode: string
  notes: string
  qrCodeUrl: string | null
}

type LedgerPayload = {
  account: {
    id: string
    name: string
    phone: string
    balance: number
    accountTypeName?: string
    cashTypeName?: string
  }
  businessName: string
  currency: string
  logoUrl?: string | null
  expiresAt: string
  transactions: Txn[]
  banks?: ShareBank[]
}

type ShareView = 'home' | 'full' | 'month' | 'banks' | 'txn'

/** Browser history payload so mobile system-back stays inside the share UI. */
type ShareHist = {
  __shareLedger: true
  view: ShareView
  returnView: Exclude<ShareView, 'txn'>
  txnId: string | null
  overlay: 'export' | 'qr' | null
  qrUrl?: string
  qrBank?: string
}

function isShareHist(value: unknown): value is ShareHist {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as ShareHist).__shareLedger === true
  )
}

const menuButtonClass =
  'flex w-full min-w-0 max-w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm transition active:scale-[0.99] hover:border-primary-200 hover:bg-primary-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/40'

function currentMonthPrefix(): string {
  return localYmd().slice(0, 7)
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function txnMonthKey(transactionDate: string): string {
  return String(transactionDate ?? '').trim().slice(0, 7)
}

/** Balance carried into the month (closing of prior period). */
function monthOpeningBalance(
  allRows: { transactionDate: string; runningBalance: number }[],
  monthPrefix: string
): number {
  let prior: number | null = null
  for (const row of allRows) {
    if (txnMonthKey(row.transactionDate) === monthPrefix) break
    prior = row.runningBalance
  }
  return prior ?? 0
}

/**
 * Public PIN-gated ledger preview for WhatsApp recipients.
 * After unlock: menu (account + last txn + actions), full / month ledger, banks.
 */
export default function SharedLedgerPage() {
  const params = useParams()
  const token = String(params?.token ?? '').trim()

  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)

  const [pin, setPin] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [ledger, setLedger] = useState<LedgerPayload | null>(null)
  const [view, setView] = useState<ShareView>('home')
  const [returnView, setReturnView] = useState<Exclude<ShareView, 'txn'>>(
    'home'
  )
  const [detailTxn, setDetailTxn] = useState<Txn | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<LedgerExportFormat>('pdf')
  const [qrPreview, setQrPreview] = useState<{
    url: string
    bankName: string
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const ledgerRef = useRef<LedgerPayload | null>(null)

  useEffect(() => {
    ledgerRef.current = ledger
  }, [ledger])

  const applyShareHist = useCallback((s: ShareHist) => {
    setView(s.view)
    setReturnView(s.returnView || 'home')
    setExportOpen(s.overlay === 'export')
    if (s.overlay === 'qr' && s.qrUrl) {
      setQrPreview({ url: s.qrUrl, bankName: s.qrBank || 'Bank' })
    } else {
      setQrPreview(null)
    }
    if (s.view === 'txn' && s.txnId) {
      const txn =
        ledgerRef.current?.transactions.find((t) => t.id === s.txnId) ?? null
      setDetailTxn(txn)
    } else {
      setDetailTxn(null)
    }
  }, [])

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (isShareHist(e.state)) {
        applyShareHist(e.state)
        return
      }
      // Back past our in-app stack: clear overlays; stay on home if unlocked.
      setExportOpen(false)
      setQrPreview(null)
      if (ledgerRef.current) {
        setView('home')
        setDetailTxn(null)
        setReturnView('home')
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [applyShareHist])

  const copyText = useCallback(async (key: string, value: string) => {
    const text = String(value ?? '').trim()
    if (!text || text === '—') return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => {
        setCopiedKey((cur) => (cur === key ? null : cur))
      }, 1600)
    } catch {
      /* clipboard may be blocked */
    }
  }, [])

  const renderCopyable = (key: string, value: string, tabular = false) => {
    const text = String(value ?? '').trim()
    if (!text) {
      return (
        <span className="font-semibold text-brand-ink dark:text-gray-50">—</span>
      )
    }
    const copied = copiedKey === key
    return (
      <button
        type="button"
        onClick={() => void copyText(key, text)}
        title={copied ? 'Copied' : 'Tap to copy'}
        aria-label={copied ? 'Copied' : `Copy ${text}`}
        className="inline-flex max-w-full min-w-0 items-center justify-end gap-1.5 rounded-md text-right font-semibold text-brand-ink transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-50 dark:hover:text-primary-300"
      >
        <span
          className={`min-w-0 break-all ${tabular ? 'tabular-nums' : ''}`}
        >
          {text}
        </span>
        {copied ? (
          <Check
            className="h-3.5 w-3.5 shrink-0 text-primary-600 dark:text-primary-400"
            aria-hidden
          />
        ) : (
          <Copy
            className="h-3.5 w-3.5 shrink-0 opacity-55"
            aria-hidden
          />
        )}
      </button>
    )
  }

  useEffect(() => {
    if (!token) {
      setMetaError('Invalid link.')
      setMetaLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setMetaLoading(true)
      setMetaError(null)
      try {
        const res = await fetch(
          `/api/ledger-shares/${encodeURIComponent(token)}`,
          { cache: 'no-store' }
        )
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setMetaError(data.error || 'Link not found.')
          setMeta(null)
          return
        }
        setMeta(data as ShareMeta)
      } catch {
        if (!cancelled) setMetaError('Could not load this link.')
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (meta?.businessName) {
      document.title = `Ledger · ${meta.accountName} · ${meta.businessName}`
    }
  }, [meta])

  const unlock = useCallback(async () => {
    if (!token) return
    setUnlocking(true)
    setUnlockError(null)
    try {
      const res = await fetch(
        `/api/ledger-shares/${encodeURIComponent(token)}/unlock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setUnlockError(data.error || 'Could not unlock.')
        return
      }
      setLedger(data as LedgerPayload)
      setView('home')
      setReturnView('home')
      setDetailTxn(null)
      setExportOpen(false)
      setQrPreview(null)
      if (typeof window !== 'undefined') {
        history.replaceState(
          {
            __shareLedger: true,
            view: 'home',
            returnView: 'home',
            txnId: null,
            overlay: null,
          } satisfies ShareHist,
          '',
          window.location.href
        )
      }
    } catch {
      setUnlockError('Could not unlock. Try again.')
    } finally {
      setUnlocking(false)
    }
  }, [token, pin])

  if (metaLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
      </main>
    )
  }

  if (metaError || !meta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-red-700">
            {metaError || 'Link not found.'}
          </p>
        </div>
      </main>
    )
  }

  if (meta.expired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <h1 className="text-lg font-semibold text-brand-ink dark:text-gray-50">Link expired</h1>
          <p className="mt-2 text-sm text-brand-stone dark:text-gray-300">
            Ask {meta.businessName} to send a new ledger message.
          </p>
        </div>
      </main>
    )
  }

  if (!ledger) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-brand-pistachio bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-center text-lg font-bold tracking-tight text-brand-ink dark:text-gray-50">
            {meta.accountName}
          </h1>
          <p className="mt-1 text-center text-sm text-brand-stone dark:text-gray-300">
            {meta.businessName}
          </p>
          <p className="mt-4 text-center text-xs text-brand-stone dark:text-gray-400">
            Enter the 4-digit access code from your message.
            <br />
            Valid until {formatDisplayDateTime(meta.expiresAt)}
          </p>

          {meta.locked ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
              Too many attempts. Try again later.
            </p>
          ) : (
            <form
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void unlock()
              }}
            >
              <label className="block text-sm font-medium text-gray-700">
                Access code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{4}"
                  maxLength={4}
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-brand-ink dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  placeholder="••••"
                  autoFocus
                />
              </label>
              {unlockError ? (
                <p className="text-center text-sm text-red-700">{unlockError}</p>
              ) : null}
              <button
                type="submit"
                disabled={unlocking || pin.length !== 4}
                className="w-full rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unlocking ? 'Checking…' : 'Continue'}
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  const currency = ledger.currency
  const logoUrl = String(ledger.logoUrl ?? '').trim()
  const allRows = ledger.transactions
  const monthPrefix = currentMonthPrefix()
  const monthRows = allRows.filter(
    (t) => txnMonthKey(t.transactionDate) === monthPrefix
  )
  const monthOpenBal = monthOpeningBalance(allRows, monthPrefix)
  const lastTxn = allRows.length > 0 ? allRows[allRows.length - 1]! : null
  const banks = ledger.banks ?? []
  // Balance due from account holder (business receivable) → they can pay via our banks.
  const showBankButton = ledger.account.balance > 0 && banks.length > 0

  const pushShareHist = (s: ShareHist) => {
    history.pushState(s, '', window.location.href)
  }

  const openShareView = (next: Exclude<ShareView, 'txn'>) => {
    setView(next)
    setDetailTxn(null)
    setExportOpen(false)
    setQrPreview(null)
    pushShareHist({
      __shareLedger: true,
      view: next,
      returnView: next,
      txnId: null,
      overlay: null,
    })
  }

  const openTxn = (txn: Txn) => {
    const parent =
      view === 'txn' ? returnView : (view as Exclude<ShareView, 'txn'>)
    setReturnView(parent)
    setDetailTxn(txn)
    setView('txn')
    setExportOpen(false)
    setQrPreview(null)
    pushShareHist({
      __shareLedger: true,
      view: 'txn',
      returnView: parent,
      txnId: txn.id,
      overlay: null,
    })
  }

  const goBack = () => {
    if (qrPreview || exportOpen || view !== 'home') {
      history.back()
    }
  }

  const openExportModal = () => {
    if (exporting) return
    setExportOpen(true)
    pushShareHist({
      __shareLedger: true,
      view,
      returnView: view === 'txn' ? returnView : (view as Exclude<ShareView, 'txn'>),
      txnId: detailTxn?.id ?? null,
      overlay: 'export',
    })
  }

  const closeExportModal = () => {
    if (exportOpen) history.back()
    else setExportOpen(false)
  }

  const openQrPreview = (url: string, bankName: string) => {
    setQrPreview({ url, bankName })
    pushShareHist({
      __shareLedger: true,
      view,
      returnView: view === 'txn' ? returnView : (view as Exclude<ShareView, 'txn'>),
      txnId: detailTxn?.id ?? null,
      overlay: 'qr',
      qrUrl: url,
      qrBank: bankName,
    })
  }

  const closeQrPreview = () => {
    if (qrPreview) history.back()
    else setQrPreview(null)
  }

  const handleExportLedger = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const lines: LedgerLine[] = allRows.map((t) => ({
        date: t.transactionDate,
        entryNumber: t.entryNumber,
        narration: t.narration,
        entryType: t.entryType === 'debit' ? 'Debit' : 'Credit',
        amount: t.amount,
        signedAmount: t.entryType === 'debit' ? -t.amount : t.amount,
        runningBalance: t.runningBalance,
      }))
      await exportLedgerFromLines(
        {
          name: ledger.account.name,
          phone: ledger.account.phone,
          accountTypeName: ledger.account.accountTypeName || '',
          cashTypeName: ledger.account.cashTypeName || '',
          balance: ledger.account.balance,
        },
        lines,
        exportFormat,
        {
          currency,
          businessName: ledger.businessName,
          logoUrl: ledger.logoUrl,
        }
      )
      closeExportModal()
    } catch {
      /* ignore — browser may block download */
    } finally {
      setExporting(false)
    }
  }

  const shellHeader = (opts?: { back?: boolean; subtitle?: string }) => (
    <header className="flex min-w-0 items-center justify-between gap-2 rounded-b-xl bg-primary-600 px-4 py-3.5 text-white sm:gap-3 sm:px-8 sm:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {opts?.back ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0">
          {logoUrl && !opts?.back ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={ledger.businessName}
              className="h-8 max-w-[120px] object-contain sm:h-9 sm:max-w-[160px]"
            />
          ) : (
            <p className="truncate text-sm font-bold tracking-tight sm:text-base">
              {opts?.subtitle || ledger.businessName}
            </p>
          )}
        </div>
      </div>
      <div className="min-w-0 max-w-[52%] shrink text-right">
        <p className="truncate text-sm font-bold tracking-tight text-red-400 sm:text-base">
          {ledger.account.name || 'Account'}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-primary-100 sm:text-[11px]">
          Valid until {formatDisplayDateTime(ledger.expiresAt)}
        </p>
      </div>
    </header>
  )

  const renderTxnList = (rows: Txn[], emptyLabel: string) => (
    <>
      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-brand-stone shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {emptyLabel}
          </div>
        ) : (
          <ul className="space-y-3.5">
            {rows.map((txn) => (
              <li key={txn.id}>
                <TransactionMobileCard
                  row={{
                    id: txn.id,
                    entryNumber: txn.entryNumber,
                    transactionDate: txn.transactionDate,
                    accountName: '',
                    narration: txn.narration,
                    entryType: txn.entryType,
                    balance: txn.amount,
                    runningBalance: txn.runningBalance,
                  }}
                  formatBalance={(n) => formatMoney(n, currency)}
                  formatDisplayDate={formatDisplayDate}
                  footerLeft={
                    txn.attachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-brand-ink shadow-sm">
                        <Paperclip className="h-3 w-3" aria-hidden />
                        {txn.attachments.length}
                      </span>
                    ) : undefined
                  }
                  onOpen={() => openTxn(txn)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-primary-600 text-white">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">No.</th>
              <th className="px-3 py-2.5 font-semibold">Narration</th>
              <th className="px-3 py-2.5 font-semibold">Type</th>
              <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
              <th className="px-3 py-2.5 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-gray-200 px-3 py-8 text-center text-brand-stone dark:border-gray-700 dark:text-gray-400"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((txn, index) => {
                const isDebit = txn.entryType === 'debit'
                const signed = isDebit ? -txn.amount : txn.amount
                return (
                  <tr
                    key={txn.id}
                    className={`cursor-pointer border border-gray-200 dark:border-gray-700 ${
                      index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'
                    } hover:bg-primary-50/60 dark:hover:bg-primary-950/30`}
                    onClick={() => openTxn(txn)}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-gray-800 dark:text-gray-100">
                      {formatDisplayDate(txn.transactionDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-800 dark:text-gray-100">
                      {txn.entryNumber}
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
                      <span className="line-clamp-2">{txn.narration || '—'}</span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 font-semibold ${
                        isDebit ? 'text-red-700' : 'text-primary-700'
                      }`}
                    >
                      {isDebit ? 'Debit' : 'Credit'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800 dark:text-gray-100">
                      {formatMoney(signed, currency)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800 dark:text-gray-100">
                      {formatMoney(txn.runningBalance, currency)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )


  const menuBtn = (
    opts: {
      title: string
      subtitle: string
      icon: ReactNode
      onClick: () => void
      accent?: boolean
    }
  ) => (
    <button
      type="button"
      onClick={opts.onClick}
      className={`${menuButtonClass} ${
        opts.accent
          ? 'border-primary-200 bg-primary-50 hover:bg-primary-100/70 dark:border-primary-800/60 dark:bg-primary-950/40 dark:hover:bg-primary-950/60'
          : ''
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          opts.accent
            ? 'bg-primary-600 text-white'
            : 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-400'
        }`}
      >
        {opts.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-bold ${
            opts.accent ? 'text-primary-800 dark:text-primary-300' : 'text-brand-ink dark:text-gray-50'
          }`}
        >
          {opts.title}
        </span>
        <span
          className={`mt-0.5 block break-words text-xs leading-snug ${
            opts.accent ? 'text-primary-700/80 dark:text-primary-400/80' : 'text-brand-stone dark:text-gray-400'
          }`}
        >
          {opts.subtitle}
        </span>
      </span>
      <ChevronRight
        className={`h-5 w-5 shrink-0 ${
          opts.accent ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
        }`}
        aria-hidden
      />
    </button>
  )

  /* ---- HOME MENU ---- */
  if (view === 'home') {
    const lastSigned =
      lastTxn &&
      (lastTxn.entryType === 'debit' ? -lastTxn.amount : lastTxn.amount)
    return (
      <main className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-lg min-w-0 lg:max-w-3xl">
          {shellHeader()}
          <div className="px-4 py-5 sm:px-6 sm:py-8">
            <div className="grid min-w-0 gap-5 lg:grid-cols-5 lg:gap-6">
              <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2 dark:border-gray-700 dark:bg-gray-800">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                  Account details
                </h2>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-brand-stone dark:text-gray-400">Name</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-brand-ink dark:text-gray-50">
                      {ledger.account.name || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-brand-stone dark:text-gray-400">Phone</dt>
                    <dd className="min-w-0 break-all text-right font-semibold text-brand-ink dark:text-gray-50">
                      {ledger.account.phone || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-brand-stone dark:text-gray-400">Account type</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-brand-ink dark:text-gray-50">
                      {ledger.account.accountTypeName || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-brand-stone dark:text-gray-400">Cash type</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-brand-ink dark:text-gray-50">
                      {ledger.account.cashTypeName || '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-gray-200 pt-2.5 dark:border-gray-700">
                    <dt className="shrink-0 font-semibold text-brand-ink dark:text-gray-50">
                      Balance
                    </dt>
                    <dd
                      className={`min-w-0 break-all text-right text-lg font-bold tabular-nums ${
                        ledger.account.balance < 0
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-primary-700 dark:text-primary-400'
                      }`}
                    >
                      {formatMoney(ledger.account.balance, currency)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="min-w-0 space-y-2.5 lg:col-span-3">
                {lastTxn && lastSigned != null
                  ? menuBtn({
                      title: 'Last transaction',
                      subtitle: `#${lastTxn.entryNumber} · ${formatDisplayDate(lastTxn.transactionDate)} · ${formatMoney(lastSigned, currency)}`,
                      icon: <Receipt className="h-5 w-5" aria-hidden />,
                      onClick: () => openTxn(lastTxn),
                    })
                  : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center text-sm text-brand-stone dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                        No transactions yet.
                      </div>
                    )}

                {menuBtn({
                  title: 'Full ledger details',
                  subtitle: `All ${allRows.length} entries`,
                  icon: <BookOpen className="h-5 w-5" aria-hidden />,
                  onClick: () => openShareView('full'),
                })}

                {menuBtn({
                  title: 'Current month ledger',
                  subtitle: `${currentMonthLabel()} · ${monthRows.length} entries · Before month ${formatMoney(monthOpenBal, currency)}`,
                  icon: <CalendarRange className="h-5 w-5" aria-hidden />,
                  onClick: () => openShareView('month'),
                })}

                {menuBtn({
                  title: exporting ? 'Exporting…' : 'Export ledger',
                  subtitle: 'PDF, Excel, or CSV download',
                  icon: <Download className="h-5 w-5" aria-hidden />,
                  onClick: () => openExportModal(),
                })}

                {showBankButton
                  ? menuBtn({
                      title: 'Bank details',
                      subtitle: 'Pay using our bank account / QR',
                      icon: <Building2 className="h-5 w-5" aria-hidden />,
                      onClick: () => openShareView('banks'),
                      accent: true,
                    })
                  : null}
              </section>
            </div>
          </div>
        </div>

        {exportOpen ? (
          <div
            className={formModalOverlayClass}
            onClick={() => {
              if (!exporting) closeExportModal()
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-export-ledger-title"
          >
            <div
              className={`${formModalPanelClass} max-w-sm`}
              onClick={(e) => e.stopPropagation()}
            >
              <FormModalHeader
                titleId="share-export-ledger-title"
                title="Export ledger"
                onClose={() => {
                  if (!exporting) closeExportModal()
                }}
              />
              <FormModalBody>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                  Download the full ledger for{' '}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {ledger.account.name}
                  </span>
                  . Choose a format:
                </p>
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: 'pdf' as const,
                        label: 'PDF',
                        hint: 'Printable ledger document',
                      },
                      {
                        id: 'excel' as const,
                        label: 'Excel (CSV)',
                        hint: 'Opens in Excel / Sheets',
                      },
                      {
                        id: 'csv' as const,
                        label: 'CSV',
                        hint: 'Plain spreadsheet file',
                      },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        exportFormat === opt.id
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="share-ledger-export-format"
                        className="mt-1"
                        checked={exportFormat === opt.id}
                        onChange={() => setExportFormat(opt.id)}
                        disabled={exporting}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {opt.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </FormModalBody>
              <FormModalFooter>
                <button
                  type="button"
                  onClick={() => closeExportModal()}
                  disabled={exporting}
                  className={formModalSecondaryButtonClass}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportLedger()}
                  disabled={exporting}
                  className={formModalPrimaryButtonClass}
                >
                  {exporting ? 'Exporting…' : 'Download'}
                </button>
              </FormModalFooter>
            </div>
          </div>
        ) : null}
      </main>
    )
  }

  /* ---- TRANSACTION DETAIL PAGE ---- */
  if (view === 'txn' && detailTxn) {
    const isDebit = detailTxn.entryType === 'debit'
    return (
      <main className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto w-full max-w-lg min-w-0 lg:max-w-2xl">
          {shellHeader({
            back: true,
            subtitle: `Entry #${detailTxn.entryNumber}`,
          })}
          <div className="px-4 py-5 sm:px-6 sm:py-8">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-sm font-semibold text-brand-ink dark:text-gray-50">
                  Transaction details
                </p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    isDebit
                      ? 'bg-red-100 text-red-800'
                      : 'bg-primary-100 text-primary-800'
                  }`}
                >
                  {detailTxn.entryType}
                </span>
              </div>
              <dl className="space-y-4 px-4 py-4 text-sm sm:px-5 sm:py-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                      Date
                    </dt>
                    <dd className="mt-1 text-brand-ink dark:text-gray-50">
                      {formatDisplayDate(detailTxn.transactionDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                      Entry no.
                    </dt>
                    <dd className="mt-1 tabular-nums text-brand-ink dark:text-gray-50">
                      #{detailTxn.entryNumber}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                    Account
                  </dt>
                  <dd className="mt-1 text-brand-ink dark:text-gray-50">
                    {ledger.account.name || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                    Narration
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                    {detailTxn.narration.trim() || '—'}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                      Amount
                    </dt>
                    <dd
                      className={`mt-1 text-base font-bold tabular-nums ${
                        isDebit ? 'text-red-700' : 'text-primary-700'
                      }`}
                    >
                      {isDebit ? '−' : '+'}
                      {formatMoney(detailTxn.amount, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                      Running balance
                    </dt>
                    <dd className="mt-1 text-base font-bold tabular-nums text-brand-ink dark:text-gray-50">
                      {formatMoney(detailTxn.runningBalance, currency)}
                    </dd>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone dark:text-gray-400">
                    Attachments
                    {detailTxn.attachments.length > 0
                      ? ` (${detailTxn.attachments.length})`
                      : ''}
                  </dt>
                  <dd className="mt-2">
                    {detailTxn.attachments.length > 0 ? (
                      <ul className="space-y-2">
                        {detailTxn.attachments.map((file) => (
                          <li key={file.id}>
                            <a
                              href={file.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-primary-700 hover:bg-primary-50 dark:border-gray-600 dark:bg-gray-700/40 dark:text-primary-400 dark:hover:bg-primary-950/30"
                            >
                              <FileText className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="truncate">{file.fileName}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-brand-stone dark:text-gray-400">
                        No attachments on this entry.
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    )
  }

  /* ---- FULL / MONTH LEDGER (PDF-style statement) ---- */
  if (view === 'full' || view === 'month') {
    const rows = view === 'full' ? allRows : monthRows
    const isMonth = view === 'month'
    const title = isMonth ? 'Current month ledger' : 'Account ledger'
    const closingBalance =
      isMonth && rows.length > 0
        ? rows[rows.length - 1]!.runningBalance
        : isMonth
          ? monthOpenBal
          : ledger.account.balance
    const exportedLabel = formatDisplayDate(new Date())

    return (
      <main className="min-h-screen bg-[#525659] dark:bg-gray-950 px-0 py-0 pb-[env(safe-area-inset-bottom)] sm:px-3 sm:py-8">
        <div className="mx-auto w-full max-w-[840px] overflow-hidden bg-white shadow-2xl sm:rounded-sm dark:bg-gray-800">
          {/* PDF-style brand bar */}
          <header className="flex items-center justify-between gap-3 bg-primary-600 px-4 py-3.5 text-white sm:px-8 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={ledger.businessName}
                    className="h-8 max-w-[140px] object-contain sm:h-9 sm:max-w-[160px]"
                  />
                ) : (
                  <p className="truncate text-sm font-bold tracking-tight sm:text-base">
                    {ledger.businessName}
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide sm:text-xs">
                {title}
              </p>
              <p className="mt-0.5 text-[10px] text-primary-100 sm:text-[11px]">
                Exported {exportedLabel}
              </p>
            </div>
          </header>

          <div className="px-4 py-4 sm:px-8 sm:py-5">
            {/* PDF-style meta panel */}
            <section className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-3.5 dark:border-gray-700 dark:bg-gray-900/40">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[12px] sm:grid-cols-2 sm:gap-y-2 sm:text-[13px]">
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Name
                  </dt>
                  <dd className="min-w-0 break-words font-semibold text-brand-ink dark:text-gray-50">
                    {ledger.account.name || '—'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Phone
                  </dt>
                  <dd className="min-w-0 break-all font-semibold text-brand-ink dark:text-gray-50">
                    {ledger.account.phone || '—'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Currency
                  </dt>
                  <dd className="font-semibold text-brand-ink dark:text-gray-50">
                    {currency || '—'}
                  </dd>
                </div>
                {isMonth ? (
                  <div className="flex gap-2">
                    <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                      Opening bal.
                    </dt>
                    <dd className="font-semibold tabular-nums text-brand-ink dark:text-gray-50">
                      {formatMoney(monthOpenBal, currency)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Closing bal.
                  </dt>
                  <dd className="font-semibold tabular-nums text-brand-ink dark:text-gray-50">
                    {formatMoney(closingBalance, currency)}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Acc. type
                  </dt>
                  <dd className="min-w-0 break-words font-semibold text-brand-ink dark:text-gray-50">
                    {ledger.account.accountTypeName || '—'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Entries
                  </dt>
                  <dd className="font-semibold text-brand-ink dark:text-gray-50">{rows.length}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Cash type
                  </dt>
                  <dd className="min-w-0 break-words font-semibold text-brand-ink dark:text-gray-50">
                    {ledger.account.cashTypeName || '—'}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-[5.75rem] shrink-0 text-brand-stone dark:text-gray-400 sm:w-[6.5rem]">
                    Document
                  </dt>
                  <dd className="font-semibold text-brand-ink dark:text-gray-50">
                    {isMonth
                      ? `Month · ${currentMonthLabel()}`
                      : 'Ledger statement'}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="my-4 border-t-[3px] border-primary-600 border-b border-b-gray-200 pb-0.5" />

            <p className="mb-3 text-[11px] text-brand-stone dark:text-gray-400 md:hidden">
              Tap a row to open details
            </p>

            {isMonth ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 sm:px-4 dark:border-gray-700 dark:bg-gray-900/40">
                <span className="text-sm font-semibold text-brand-ink dark:text-gray-50">
                  Opening balance
                  <span className="mt-0.5 block text-[11px] font-normal text-brand-stone dark:text-gray-400">
                    Balance before {currentMonthLabel()}
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums text-brand-ink dark:text-gray-50">
                  {formatMoney(monthOpenBal, currency)}
                </span>
              </div>
            ) : null}

            {renderTxnList(
              rows,
              isMonth
                ? 'No transactions this month.'
                : 'No transactions yet.'
            )}

            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-primary-200 bg-primary-50 px-3 py-3 sm:px-4 dark:border-primary-800/60 dark:bg-primary-950/40">
              <span className="text-sm font-bold text-primary-800 dark:text-primary-300">
                Closing balance
              </span>
              <span className="text-sm font-bold tabular-nums text-primary-800 dark:text-primary-300">
                {formatMoney(closingBalance, currency)}
              </span>
            </div>
          </div>

          <footer className="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 text-[11px] text-brand-stone dark:border-gray-700 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8">
            <span className="min-w-0 break-words">
              {ledger.businessName} — Confidential ledger export
            </span>
            <span className="shrink-0">{rows.length} entries</span>
          </footer>
        </div>
        <ScrollToTopButton dock="page" />
      </main>
    )
  }

  /* ---- BANKS ---- */
  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-lg min-w-0 lg:max-w-3xl">
        {shellHeader({ back: true, subtitle: 'Bank details' })}
        <div className="space-y-4 px-4 py-5 sm:px-6 sm:py-8">
          <p className="text-sm text-brand-stone dark:text-gray-300">
            Use any account below to pay{' '}
            <span className="font-semibold text-brand-ink dark:text-gray-50">
              {formatMoney(ledger.account.balance, currency)}
            </span>
            . Tap account details to copy. Scan the QR where available.
          </p>
          <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
            {banks.map((bank) => (
              <article
                key={bank.id}
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="shrink-0 border-b border-primary-200 bg-primary-100 px-4 py-3 dark:border-primary-800 dark:bg-primary-900">
                  <h3 className="text-lg font-bold tracking-tight text-brand-ink dark:text-white">
                    {bank.bankName || 'Bank'}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-primary-800 dark:text-primary-300">
                    {bank.accountTitle || '—'}
                  </p>
                </div>
                <div className="flex min-h-[7.5rem] flex-1 flex-col space-y-2 px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <span className="shrink-0 pt-0.5 text-brand-stone dark:text-gray-400">
                      Account no.
                    </span>
                    {renderCopyable(
                      `${bank.id}-account`,
                      bank.accountNumber || '',
                      true
                    )}
                  </div>
                  {bank.iban ? (
                    <div className="flex items-start justify-between gap-2">
                      <span className="shrink-0 pt-0.5 text-brand-stone dark:text-gray-400">
                        IBAN
                      </span>
                      {renderCopyable(`${bank.id}-iban`, bank.iban)}
                    </div>
                  ) : null}
                  {bank.branchName ? (
                    <div className="flex items-start justify-between gap-2">
                      <span className="shrink-0 pt-0.5 text-brand-stone dark:text-gray-400">
                        Branch
                      </span>
                      {renderCopyable(
                        `${bank.id}-branch`,
                        `${bank.branchName}${bank.branchCode ? ` (${bank.branchCode})` : ''}`
                      )}
                    </div>
                  ) : null}
                  {bank.swiftCode ? (
                    <div className="flex items-start justify-between gap-2">
                      <span className="shrink-0 pt-0.5 text-brand-stone dark:text-gray-400">
                        SWIFT
                      </span>
                      {renderCopyable(`${bank.id}-swift`, bank.swiftCode)}
                    </div>
                  ) : null}
                  {bank.notes ? (
                    <p className="border-t border-gray-200 pt-2 text-xs text-brand-stone dark:border-gray-700 dark:text-gray-400">
                      {bank.notes}
                    </p>
                  ) : null}
                </div>
                {bank.qrCodeUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      openQrPreview(
                        bank.qrCodeUrl!,
                        bank.bankName || 'Bank'
                      )
                    }
                    className="mt-auto flex min-h-[14.75rem] w-full shrink-0 flex-col items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-4 text-center transition hover:bg-primary-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:bg-primary-950/30"
                    aria-label={`Open ${bank.bankName || 'bank'} QR full screen`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bank.qrCodeUrl}
                      alt={`${bank.bankName} QR`}
                      className="h-44 w-44 rounded-xl border border-gray-200 bg-white object-contain p-2 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <p className="mt-2 text-xs font-medium text-primary-700 dark:text-primary-400">
                      Tap to enlarge · Scan to pay
                    </p>
                  </button>
                ) : (
                  <div
                    className="mt-auto min-h-[14.75rem] shrink-0 border-t border-dashed border-gray-200 dark:border-gray-700"
                    aria-hidden
                  />
                )}
              </article>
            ))}
          </div>
        </div>
      </div>

      {qrPreview ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
          aria-label={`${qrPreview.bankName} QR code`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-primary-600 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{qrPreview.bankName}</p>
              <p className="text-[11px] text-primary-100">
                Hold phone steady and scan
              </p>
            </div>
            <button
              type="button"
              onClick={() => closeQrPreview()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Close QR"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-white p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrPreview.url}
              alt={`${qrPreview.bankName} QR full screen`}
              className="h-auto w-full max-w-sm object-contain"
            />
            <p className="text-sm font-medium text-brand-ink">
              Scan this QR to pay
            </p>
          </div>
        </div>
      ) : null}
    </main>
  )
}

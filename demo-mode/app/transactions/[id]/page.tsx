'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Loader2,
  MessageCircle,
  Pencil,
} from 'lucide-react'
import TransactionDocumentsPanel from '@/components/TransactionDocumentsPanel'
import { WhatsAppPrepOverlay } from '@/components/WhatsAppPrepOverlay'
import { fetchAccounts, getCachedAccounts } from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'
import {
  buildShareAccessFooter,
  createLedgerShare,
  formatShareExpiryLabel,
} from '@/lib/ledgerShare'
import { formatDisplayDate } from '@/lib/localDate'
import { formatMoney } from '@/lib/money'
import {
  fillMessageTemplate,
  openWhatsAppMessage,
  transactionMessageVars,
} from '@/lib/messageTemplates'
import {
  fetchTransactions,
  getCachedTransactions,
  signedTransactionAmount,
  type TransactionEntryType,
  type TransactionRecord,
} from '@/lib/transactions'
import { openWhatsAppPrepTab } from '@/lib/whatsappPrepTab'

function entryTypeBadgeClass(type: TransactionEntryType): string {
  return type === 'credit'
    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/35 dark:text-primary-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-300'
}

function amountColorClass(type: TransactionEntryType): string {
  return type === 'credit'
    ? 'text-primary-700 dark:text-primary-400'
    : 'text-red-700 dark:text-red-400'
}

function runningBalanceColorClass(amount: number): string {
  if (amount > 0) return 'text-primary-700 dark:text-primary-400'
  if (amount < 0) return 'text-red-700 dark:text-red-400'
  return 'text-gray-900 dark:text-gray-100'
}

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

/**
 * Transaction detail page — replaces the old list popup.
 * URL: /transactions/{id}
 */
function sortTxnsChronological(rows: TransactionRecord[]): TransactionRecord[] {
  return rows.slice().sort((a, b) => {
    const byDate = a.transactionDate.localeCompare(b.transactionDate)
    if (byDate !== 0) return byDate
    return a.entryNumber - b.entryNumber
  })
}

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '').trim()
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<TransactionRecord | null>(null)
  const [allRows, setAllRows] = useState<TransactionRecord[]>(
    () => getCachedTransactions() ?? []
  )
  const [docCount, setDocCount] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [waPrepPercent, setWaPrepPercent] = useState(0)
  const [waPrepLabel, setWaPrepLabel] = useState('Preparing…')
  const [sendError, setSendError] = useState<string | null>(null)

  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )
  const [transactionMessageTemplate, setTransactionMessageTemplate] = useState(
    () =>
      getCachedAppSettings()?.transactionMessageTemplate ??
      DEFAULT_APP_SETTINGS.transactionMessageTemplate
  )
  const [messageNotePlus, setMessageNotePlus] = useState(
    () => getCachedAppSettings()?.messageNotePlus ?? DEFAULT_APP_SETTINGS.messageNotePlus
  )
  const [messageNoteMinus, setMessageNoteMinus] = useState(
    () =>
      getCachedAppSettings()?.messageNoteMinus ?? DEFAULT_APP_SETTINGS.messageNoteMinus
  )
  const [messageNoteZero, setMessageNoteZero] = useState(
    () => getCachedAppSettings()?.messageNoteZero ?? DEFAULT_APP_SETTINGS.messageNoteZero
  )
  const [transactionMessageIncludeLedgerUrl, setTransactionMessageIncludeLedgerUrl] =
    useState(
      () =>
        getCachedAppSettings()?.transactionMessageIncludeLedgerUrl ??
        DEFAULT_APP_SETTINGS.transactionMessageIncludeLedgerUrl
    )

  useEffect(() => {
    return watchAppSettings((s) => {
      setCurrency(s.currency)
      setBusinessName(s.businessName)
      setTransactionMessageTemplate(s.transactionMessageTemplate)
      setMessageNotePlus(s.messageNotePlus)
      setMessageNoteMinus(s.messageNoteMinus)
      setMessageNoteZero(s.messageNoteZero)
      setTransactionMessageIncludeLedgerUrl(s.transactionMessageIncludeLedgerUrl)
    })
  }, [])

  useEffect(() => {
    if (!id) {
      setError('Transaction not found.')
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await fetchTransactions()
        if (cancelled) return
        setAllRows(items)
        const found = items.find((t) => t.id === id) ?? null
        if (!found) {
          setRow(null)
          setError('Transaction not found.')
        } else {
          setRow(found)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load transaction')
          setRow(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const runningBalance = useMemo(() => {
    if (!row) return 0
    return runningBalanceFor(allRows, row)
  }, [allRows, row])

  const navRows = useMemo(() => sortTxnsChronological(allRows), [allRows])
  const navIndex = useMemo(
    () => (row ? navRows.findIndex((t) => t.id === row.id) : -1),
    [navRows, row]
  )
  const prevTxn = navIndex > 0 ? navRows[navIndex - 1]! : null
  const nextTxn =
    navIndex >= 0 && navIndex < navRows.length - 1 ? navRows[navIndex + 1]! : null
  const canSwipeNav = Boolean(prevTxn || nextTxn)

  const goToAdjacent = useCallback(
    (txn: TransactionRecord) => {
      router.replace(`/transactions/${encodeURIComponent(txn.id)}`)
    },
    [router]
  )

  // Arrow keys: same as shared ledger detail prev/next.
  useEffect(() => {
    if (!row) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.key === 'ArrowLeft' && prevTxn) {
        e.preventDefault()
        goToAdjacent(prevTxn)
      } else if (e.key === 'ArrowRight' && nextTxn) {
        e.preventDefault()
        goToAdjacent(nextTxn)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [row, prevTxn, nextTxn, goToAdjacent])

  const sendMessage = useCallback(async () => {
    if (!row || sendingMessage) return
    const template = transactionMessageTemplate.trim()
    if (!template) {
      setSendError('Set a transaction message template in Settings first.')
      return
    }
    setSendingMessage(true)
    setSendError(null)
    setWaPrepPercent(8)
    setWaPrepLabel('Preparing message…')
    const prep = openWhatsAppPrepTab('Preparing message…')
    const bump = (percent: number, label: string) => {
      setWaPrepPercent(percent)
      setWaPrepLabel(label)
      prep?.setProgress(percent, label)
    }

    try {
      const accounts = getCachedAccounts() ?? (await fetchAccounts())
      const account = accounts.find((a) => a.id === row.accountId)
      const currentBalance = runningBalance
      const previousBalance = currentBalance - signedTransactionAmount(row)

      let ledgerUrl = ''
      let ledgerPin = ''
      let ledgerExpiresIso = ''
      let ledgerExpires = ''

      if (transactionMessageIncludeLedgerUrl) {
        if (!account) {
          setSendError('Account not found — cannot create ledger preview link.')
        } else {
          bump(20, 'Creating secure ledger link…')
          try {
            const share = await createLedgerShare(account.id)
            ledgerUrl = share.url
            ledgerPin = share.pin
            ledgerExpiresIso = share.expiresAt
            ledgerExpires = formatShareExpiryLabel(share.expiresAt)
          } catch (err) {
            setSendError(
              err instanceof Error
                ? err.message
                : 'Could not create secure ledger link.'
            )
          }
        }
      } else {
        bump(40, 'Composing message…')
      }

      bump(82, 'Composing message…')
      let text = fillMessageTemplate(
        template,
        transactionMessageVars(row, {
          businessName,
          currency,
          phone: account?.phone,
          previousBalance,
          currentBalance,
          notes: {
            plus: messageNotePlus,
            minus: messageNoteMinus,
            zero: messageNoteZero,
          },
          ledgerUrl,
          ledgerPin,
          ledgerExpires,
        })
      )

      if (ledgerUrl && transactionMessageIncludeLedgerUrl) {
        const footer = buildShareAccessFooter({
          url: ledgerUrl,
          pin: ledgerPin,
          expiresAt: ledgerExpiresIso || new Date().toISOString(),
        })
        if (/\{\{\s*ledger_url\s*\}\}/i.test(template)) {
          if (!text.includes(ledgerUrl)) {
            text = `${text.trim()}\n\n${footer}`
          }
        } else {
          text = `${text.trim()}\n\n${footer}`
        }
        if (ledgerPin && !text.includes(ledgerPin)) {
          text = `${text.trim()}\nAccess code: ${ledgerPin}`
        }
        if (ledgerExpires && !text.includes(ledgerExpires)) {
          text = `${text.trim()}\nValid until: ${ledgerExpires}`
        }
      }

      text = text
        .replace(/^[ \t]*PDF:[ \t]*$/gim, '')
        .replace(/^[ \t]*Ledger:[ \t]*$/gim, '')
        .replace(/^[ \t]*Access code:[ \t]*$/gim, '')
        .replace(/^[ \t]*Valid until:[ \t]*$/gim, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

      bump(96, 'Opening WhatsApp…')
      openWhatsAppMessage(account?.phone, text, prep)
    } catch (err) {
      prep?.close()
      setSendError(
        err instanceof Error ? err.message : 'Could not open WhatsApp message.'
      )
    } finally {
      setSendingMessage(false)
      setWaPrepPercent(0)
    }
  }, [
    row,
    sendingMessage,
    transactionMessageTemplate,
    transactionMessageIncludeLedgerUrl,
    runningBalance,
    businessName,
    currency,
    messageNotePlus,
    messageNoteMinus,
    messageNoteZero,
  ])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-4 lg:p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden />
      </div>
    )
  }

  if (error || !row) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/transactions"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back to transactions"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Transaction
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error || 'Transaction not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/transactions"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back to transactions"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl">
            {row.accountName || 'Transaction'}
          </h1>
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${entryTypeBadgeClass(row.entryType)}`}
          >
            {row.entryType}
          </span>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                infoOpen
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
              }`}
              aria-label="About this transaction"
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
                  className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Entry #{row.entryNumber} — details and attachments.
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sendingMessage}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label="Send message"
            title="Send message"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <MessageCircle className="h-5 w-5" aria-hidden />
            )}
          </button>
          <Link
            href={`/transactions?edit=${encodeURIComponent(row.id)}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>

      {sendError ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {sendError}
        </p>
      ) : null}

      <div
        className="touch-pan-y overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
        onTouchStart={(e) => {
          if (!canSwipeNav) return
          const t = e.changedTouches[0]
          if (!t) return
          touchStartRef.current = { x: t.clientX, y: t.clientY }
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current
          touchStartRef.current = null
          if (!start || !canSwipeNav) return
          const t = e.changedTouches[0]
          if (!t) return
          const dx = t.clientX - start.x
          const dy = t.clientY - start.y
          if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy)) return
          if (dx < 0 && nextTxn) goToAdjacent(nextTxn)
          else if (dx > 0 && prevTxn) goToAdjacent(prevTxn)
        }}
      >
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Details
          </h2>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <dl className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Transaction Date
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {formatDisplayDate(row.transactionDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  SR.
                </dt>
                <dd className="mt-0.5 tabular-nums text-gray-900 dark:text-gray-100">
                  {row.entryNumber}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Narration
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                {row.narration.trim() ? row.narration : '—'}
              </dd>
            </div>
            <div className="grid grid-cols-2 items-start gap-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Balance
                </dt>
                <dd
                  className={`mt-0.5 font-medium tabular-nums ${amountColorClass(row.entryType)}`}
                >
                  {row.entryType === 'debit' ? '− ' : '+ '}
                  {formatMoney(Math.abs(row.balance), currency)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Running Balance
                </dt>
                <dd
                  className={`mt-0.5 font-medium tabular-nums ${runningBalanceColorClass(runningBalance)}`}
                >
                  {formatMoney(runningBalance, currency)}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <TransactionDocumentsPanel
            key={row.id}
            transactionId={row.id}
            active
            hideHint
            heading={`Documents${docCount > 0 ? ` (${docCount})` : ''}`}
            headingInfo="Optional. Any type, multiple files (max 100MB each)."
            onFilesChange={(items) => setDocCount(items.length)}
          />
        </div>
      </div>

      {canSwipeNav ? (
        <>
          <p className="mt-3 text-center text-[11px] text-gray-500 sm:hidden dark:text-gray-400">
            Swipe left or right for previous / next entry
          </p>
          <div className="mt-4 hidden items-center justify-between gap-3 sm:flex">
            <button
              type="button"
              disabled={!prevTxn}
              onClick={() => prevTxn && goToAdjacent(prevTxn)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Previous
            </button>
            <span className="tabular-nums text-xs text-gray-500 dark:text-gray-400">
              {navIndex >= 0 ? navIndex + 1 : '—'} / {navRows.length}
            </span>
            <button
              type="button"
              disabled={!nextTxn}
              onClick={() => nextTxn && goToAdjacent(nextTxn)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
            >
              Next
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </>
      ) : null}

      <WhatsAppPrepOverlay
        open={sendingMessage}
        percent={waPrepPercent}
        label={waPrepLabel}
      />
    </div>
  )
}

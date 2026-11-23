'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Info,
  Loader2,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
} from 'lucide-react'
import FloatingActionsButton from '@/components/FloatingActionsButton'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalDangerButtonClass,
  formModalOverlayClass,
  formModalPanelClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import TransactionDocumentsPanel, {
  documentsActionBtnClass,
} from '@/components/TransactionDocumentsPanel'
import { WhatsAppPrepOverlay } from '@/components/WhatsAppPrepOverlay'
import {
  deleteAccount,
  fetchAccounts,
  getCachedAccounts,
  type AccountRecord,
} from '@/lib/accounts'
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
import { saveAccountLedgerPdfToDocuments } from '@/lib/ledgerExport'
import { formatMoney } from '@/lib/money'
import {
  accountMessageVars,
  fillMessageTemplate,
  openWhatsAppMessage,
} from '@/lib/messageTemplates'
import { toWhatsAppDigits } from '@/lib/phone'

function balanceColorClass(balance: number): string {
  if (balance > 0) return 'text-green-700 dark:text-green-400'
  if (balance < 0) return 'text-red-700 dark:text-red-400'
  return 'text-gray-900 dark:text-gray-100'
}

function balanceBadgeClass(balance: number): string {
  if (balance > 0)
    return 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300'
  if (balance < 0)
    return 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
}

function sortAccountsByName(rows: AccountRecord[]): AccountRecord[] {
  return rows.slice().sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    if (byName !== 0) return byName
    return a.id.localeCompare(b.id)
  })
}

/**
 * Account detail page — replaces the old list popup.
 * URL: /accounts/{id}
 */
export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id ?? '').trim()
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<AccountRecord | null>(null)
  const [allRows, setAllRows] = useState<AccountRecord[]>(
    () => getCachedAccounts() ?? []
  )
  const [docCount, setDocCount] = useState(0)
  const [docsNonce, setDocsNonce] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [savingLedgerPdf, setSavingLedgerPdf] = useState(false)
  const [waPrepPercent, setWaPrepPercent] = useState(0)
  const [waPrepLabel, setWaPrepLabel] = useState('Preparing…')
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => getCachedAppSettings()?.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl
  )
  const [accountMessageTemplate, setAccountMessageTemplate] = useState(
    () =>
      getCachedAppSettings()?.accountMessageTemplate ??
      DEFAULT_APP_SETTINGS.accountMessageTemplate
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
  const [accountMessageIncludeLedgerUrl, setAccountMessageIncludeLedgerUrl] = useState(
    () =>
      getCachedAppSettings()?.accountMessageIncludeLedgerUrl ??
      DEFAULT_APP_SETTINGS.accountMessageIncludeLedgerUrl
  )

  useEffect(() => {
    return watchAppSettings((s) => {
      setCurrency(s.currency)
      setBusinessName(s.businessName)
      setLogoUrl(s.logoUrl)
      setAccountMessageTemplate(s.accountMessageTemplate)
      setMessageNotePlus(s.messageNotePlus)
      setMessageNoteMinus(s.messageNoteMinus)
      setMessageNoteZero(s.messageNoteZero)
      setAccountMessageIncludeLedgerUrl(s.accountMessageIncludeLedgerUrl)
    })
  }, [])

  useEffect(() => {
    if (!id) {
      setError('Account not found.')
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const cached = getCachedAccounts()
        if (cached) {
          if (!cancelled) setAllRows(cached)
          const hit = cached.find((a) => a.id === id) ?? null
          if (hit && !cancelled) {
            setRow(hit)
            setLoading(false)
          }
        }
        const items = await fetchAccounts()
        if (cancelled) return
        setAllRows(items)
        const found = items.find((a) => a.id === id) ?? null
        if (!found) {
          setError('Account not found.')
          setRow(null)
        } else {
          setRow(found)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load account')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const navRows = useMemo(() => sortAccountsByName(allRows), [allRows])
  const navIndex = useMemo(
    () => (row ? navRows.findIndex((a) => a.id === row.id) : -1),
    [navRows, row]
  )
  const prevAccount = navIndex > 0 ? navRows[navIndex - 1]! : null
  const nextAccount =
    navIndex >= 0 && navIndex < navRows.length - 1 ? navRows[navIndex + 1]! : null
  const canSwipeNav = Boolean(prevAccount || nextAccount)

  const goToAdjacent = useCallback(
    (account: AccountRecord) => {
      router.replace(`/accounts/${encodeURIComponent(account.id)}`)
    },
    [router]
  )

  useEffect(() => {
    if (!row) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.key === 'ArrowLeft' && prevAccount) {
        e.preventDefault()
        goToAdjacent(prevAccount)
      } else if (e.key === 'ArrowRight' && nextAccount) {
        e.preventDefault()
        goToAdjacent(nextAccount)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [row, prevAccount, nextAccount, goToAdjacent])

  const formatBalance = useCallback(
    (balance: number) => formatMoney(balance, currency),
    [currency]
  )

  const sendMessage = useCallback(async () => {
    if (!row || sendingMessage || savingLedgerPdf) return
    const template = accountMessageTemplate.trim()
    if (!template) {
      setActionError('Set an Account message template in Settings first.')
      return
    }
    setSendingMessage(true)
    setActionError(null)
    setWaPrepPercent(5)
    setWaPrepLabel('Preparing message…')
    // In-app overlay only — stay on this page while preparing, then open WhatsApp.
    const bump = (percent: number, label: string) => {
      setWaPrepPercent(percent)
      setWaPrepLabel(label)
    }
    try {
      let ledgerUrl = ''
      let ledgerPin = ''
      let ledgerExpiresIso = ''
      let ledgerExpires = ''
      if (accountMessageIncludeLedgerUrl) {
        bump(20, 'Creating secure ledger link…')
        try {
          const share = await createLedgerShare(row.id)
          ledgerUrl = share.url
          ledgerPin = share.pin
          ledgerExpiresIso = share.expiresAt
          ledgerExpires = formatShareExpiryLabel(share.expiresAt)
        } catch (err) {
          setActionError(
            err instanceof Error
              ? err.message
              : 'Could not create secure ledger link.'
          )
        }
      }
      bump(70, 'Composing message…')
      let text = fillMessageTemplate(
        template,
        accountMessageVars(row, {
          businessName,
          currency,
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
      if (ledgerUrl && accountMessageIncludeLedgerUrl) {
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
        .replace(/^[ \t]*Ledger:[ \t]*$/gim, '')
        .replace(/^[ \t]*Access code:[ \t]*$/gim, '')
        .replace(/^[ \t]*Valid until:[ \t]*$/gim, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      bump(100, 'Opening WhatsApp…')
      setSendingMessage(false)
      setWaPrepPercent(0)
      openWhatsAppMessage(row.phone, text)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not open WhatsApp message.'
      )
      setSendingMessage(false)
      setWaPrepPercent(0)
    }
  }, [
    row,
    sendingMessage,
    savingLedgerPdf,
    accountMessageTemplate,
    accountMessageIncludeLedgerUrl,
    businessName,
    currency,
    messageNotePlus,
    messageNoteMinus,
    messageNoteZero,
  ])

  const saveLedgerPdf = useCallback(async () => {
    if (!row || savingLedgerPdf || sendingMessage) return
    setSavingLedgerPdf(true)
    setActionError(null)
    try {
      await saveAccountLedgerPdfToDocuments(row, {
        currency,
        businessName,
        logoUrl,
      })
      setDocsNonce((n) => n + 1)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not save ledger PDF to documents.'
      )
    } finally {
      setSavingLedgerPdf(false)
    }
  }, [row, savingLedgerPdf, sendingMessage, currency, businessName, logoUrl])

  const handleDelete = useCallback(async () => {
    if (!row || deleting) return
    setDeleting(true)
    setActionError(null)
    try {
      await deleteAccount(row.id)
      setDeleteConfirmOpen(false)
      router.push('/accounts')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }, [row, deleting, router])

  const actionItems = useMemo(() => {
    if (!row) return []
    return [
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        danger: true as const,
        onClick: () => setDeleteConfirmOpen(true),
      },
      {
        key: 'send',
        label: sendingMessage ? 'Sending…' : 'Send message',
        icon: MessageCircle,
        disabled: sendingMessage || savingLedgerPdf,
        onClick: () => {
          void sendMessage()
        },
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: Pencil,
        primary: true as const,
        onClick: () =>
          router.push(
            `/accounts/${encodeURIComponent(row.id)}/edit?from=${encodeURIComponent(`/accounts/${row.id}`)}`
          ),
      },
    ]
  }, [row, savingLedgerPdf, sendingMessage, sendMessage, router])

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
            href="/accounts"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back to accounts"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Account
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error || 'Account not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/accounts"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back to accounts"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl">
            {row.name}
          </h1>
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${balanceBadgeClass(row.balance)}`}
          >
            {formatBalance(row.balance)}
          </span>
        </div>
        <FloatingActionsButton
          ariaLabel="Account actions"
          items={actionItems}
        />
      </div>

      {actionError ? (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {actionError}
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
          if (dx < 0 && nextAccount) goToAdjacent(nextAccount)
          else if (dx > 0 && prevAccount) goToAdjacent(prevAccount)
        }}
      >
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Details
            </h2>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setInfoOpen((v) => !v)}
                className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  infoOpen
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
                }`}
                aria-label="About details"
                aria-expanded={infoOpen}
              >
                <Info className="h-4 w-4" aria-hidden />
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
                    className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Account profile — name, phone, balance, and type. Tap the
                    name to open this account’s transactions.
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Account Name
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-gray-100">
                <Link
                  href={`/transactions?accountId=${encodeURIComponent(row.id)}&from=${encodeURIComponent(`/accounts/${row.id}`)}`}
                  className="text-primary-700 hover:underline dark:text-primary-300"
                >
                  {row.name}
                </Link>
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Phone
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {row.phone ? (
                    <a
                      href={`tel:+${toWhatsAppDigits(row.phone)}`}
                      className="inline-flex items-center gap-1.5 text-primary-600 hover:underline dark:text-primary-400"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {row.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Balance
                </dt>
                <dd
                  className={`mt-0.5 font-medium tabular-nums ${balanceColorClass(row.balance)}`}
                >
                  {formatBalance(row.balance)}
                </dd>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Account Type
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {row.accountTypeName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cash Type
                </dt>
                <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                  {row.cashTypeName || '—'}
                </dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <TransactionDocumentsPanel
            key={`${row.id}-${docsNonce}`}
            accountId={row.id}
            active
            hideHint
            heading={`Documents${docCount > 0 ? ` (${docCount})` : ''}`}
            headingInfo="Optional. Any type, multiple files (max 100MB each)."
            headingActions={
              <button
                type="button"
                className={documentsActionBtnClass}
                disabled={savingLedgerPdf || sendingMessage}
                onClick={() => void saveLedgerPdf()}
                aria-label={
                  savingLedgerPdf ? 'Saving ledger PDF…' : 'Save ledger PDF'
                }
                title={
                  savingLedgerPdf ? 'Saving ledger PDF…' : 'Save ledger PDF'
                }
              >
                {savingLedgerPdf ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <FileText className="h-4 w-4 shrink-0" aria-hidden />
                )}
                <span className="hidden sm:inline">
                  {savingLedgerPdf ? 'Saving PDF…' : 'Save ledger PDF'}
                </span>
              </button>
            }
            onFilesChange={(items) => setDocCount(items.length)}
          />
        </div>
      </div>

      {canSwipeNav ? (
        <>
          <p className="mt-3 text-center text-[11px] text-gray-500 sm:hidden dark:text-gray-400">
            Swipe left or right for previous / next account
          </p>
          <div className="mt-4 hidden items-center justify-between gap-3 sm:flex">
            <button
              type="button"
              disabled={!prevAccount}
              onClick={() => prevAccount && goToAdjacent(prevAccount)}
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
              disabled={!nextAccount}
              onClick={() => nextAccount && goToAdjacent(nextAccount)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:hover:border-primary-700 dark:hover:bg-primary-950/40"
            >
              Next
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </>
      ) : null}

      {deleteConfirmOpen ? (
        <div
          className={formModalOverlayClass}
          onClick={() => !deleting && setDeleteConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-detail-title"
        >
          <div
            className={`${formModalPanelClass} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <FormModalHeader
              titleId="delete-account-detail-title"
              title="Delete Account?"
              onClose={() => !deleting && setDeleteConfirmOpen(false)}
            />
            <FormModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This permanently removes the account. Related ledger data may be
                affected.
              </p>
            </FormModalBody>
            <FormModalFooter>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className={formModalDangerButtonClass}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className={formModalSecondaryButtonClass}
              >
                Cancel
              </button>
            </FormModalFooter>
          </div>
        </div>
      ) : null}

      <WhatsAppPrepOverlay
        open={sendingMessage}
        percent={waPrepPercent}
        label={waPrepLabel}
        onForceClose={() => {
          setSendingMessage(false)
          setWaPrepPercent(0)
        }}
      />
    </div>
  )
}

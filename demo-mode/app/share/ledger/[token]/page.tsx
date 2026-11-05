'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Lock, Paperclip } from 'lucide-react'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalOverlayClass,
  formModalPanelClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import TransactionMobileCard from '@/components/TransactionMobileCard'
import {
  fetchLedgerShareMeta,
  unlockLedgerShareDemo,
} from '@/lib/ledgerShare'
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
}

function formatDisplayDate(iso: string): string {
  const raw = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '—'
  const [y, m, d] = raw.split('-')
  return `${d}-${m}-${y}`
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function formatExportedOn(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Demo Mode: PIN-gated ledger preview (statement + txn detail popup). */
export default function DemoSharedLedgerPage() {
  const params = useParams()
  const token = String(params?.token ?? '').trim()

  const [meta, setMeta] = useState<ShareMeta | null>(null)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)

  const [pin, setPin] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [ledger, setLedger] = useState<LedgerPayload | null>(null)
  const [detailTxn, setDetailTxn] = useState<Txn | null>(null)

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
        const next = await fetchLedgerShareMeta(token)
        if (!cancelled) setMeta(next)
      } catch (err) {
        if (!cancelled) {
          setMetaError(err instanceof Error ? err.message : 'Link not found.')
        }
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
      const payload = await unlockLedgerShareDemo(token, pin)
      setLedger(payload as LedgerPayload)
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'Could not unlock.')
    } finally {
      setUnlocking(false)
    }
  }, [token, pin])

  if (metaLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-antiFlash p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
      </main>
    )
  }

  if (metaError || !meta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-antiFlash p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
          <p className="text-sm text-red-700">
            {metaError || 'Link not found.'}
          </p>
        </div>
      </main>
    )
  }

  if (meta.expired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-antiFlash p-6">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-lg font-semibold text-brand-ink">Link expired</h1>
          <p className="mt-2 text-sm text-brand-stone">
            Ask {meta.businessName} to send a new ledger message.
          </p>
        </div>
      </main>
    )
  }

  if (!ledger) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-antiFlash px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-brand-pistachio bg-white p-6 shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-center text-lg font-bold tracking-tight text-brand-ink">
            {meta.accountName}
          </h1>
          <p className="mt-1 text-center text-sm text-brand-stone">
            {meta.businessName}
          </p>
          <p className="mt-4 text-center text-xs text-brand-stone">
            Enter the 4-digit access code from your message.
            <br />
            Valid until {formatExpiry(meta.expiresAt)}
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
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.4em] text-brand-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
                {unlocking ? 'Checking…' : 'View ledger'}
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  const currency = ledger.currency
  const accountTypeName = ledger.account.accountTypeName || '—'
  const cashTypeName = ledger.account.cashTypeName || '—'
  const logoUrl = String(ledger.logoUrl ?? '').trim()
  const rows = ledger.transactions

  return (
    <main className="min-h-screen bg-[#525659] px-0 py-0 pb-[env(safe-area-inset-bottom)] sm:px-3 sm:py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto w-full max-w-[840px] overflow-hidden bg-white shadow-2xl sm:rounded-sm print:max-w-none print:shadow-none">
        {/* Brand bar — matches ledger PDF header */}
        <header className="flex items-center justify-between gap-3 bg-primary-600 px-4 py-3.5 text-white sm:px-8 sm:py-4">
          <div className="min-w-0 flex-1">
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
          <div className="max-w-[58%] shrink-0 text-right sm:max-w-[50%]">
            <p className="truncate text-sm font-bold tracking-tight text-red-400 sm:text-base">
              {ledger.account.name || 'Account'}
            </p>
            <p className="mt-0.5 text-[10px] text-primary-100 sm:text-[11px]">
              Exported {formatExportedOn()}
            </p>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-8 sm:py-5">
          {/* Meta panel */}
          <section className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-3.5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[12px] sm:grid-cols-2 sm:gap-y-2 sm:text-[13px]">
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Name
                </dt>
                <dd className="min-w-0 break-words font-semibold text-brand-ink">
                  {ledger.account.name || '—'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Phone
                </dt>
                <dd className="min-w-0 break-all font-semibold text-brand-ink">
                  {ledger.account.phone || '—'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Currency
                </dt>
                <dd className="font-semibold text-brand-ink">{currency || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Closing bal.
                </dt>
                <dd className="font-semibold tabular-nums text-brand-ink">
                  {formatMoney(ledger.account.balance, currency)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Acc. type
                </dt>
                <dd className="min-w-0 break-words font-semibold text-brand-ink">
                  {accountTypeName}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Entries
                </dt>
                <dd className="font-semibold text-brand-ink">{rows.length}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Cash type
                </dt>
                <dd className="min-w-0 break-words font-semibold text-brand-ink">
                  {cashTypeName}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[5.75rem] shrink-0 text-brand-stone sm:w-[6.5rem]">
                  Document
                </dt>
                <dd className="font-semibold text-brand-ink">Ledger statement</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-gray-200 pt-2 text-[11px] leading-snug text-brand-stone">
              Link valid until {formatExpiry(ledger.expiresAt)}
            </p>
          </section>

          <div className="my-4 border-t-[3px] border-primary-600 border-b border-b-gray-200 pb-0.5" />

          {/* Mobile: same curved brand-sky cards as Transactions page */}
          <div className="md:hidden">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-stone">
              Transactions · tap a card for details
            </p>
            {rows.length === 0 ? (
              <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-brand-stone shadow-md">
                No transactions yet.
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
                      actions={
                        txn.attachments.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-brand-ink shadow-sm">
                            <Paperclip className="h-3 w-3" aria-hidden />
                            {txn.attachments.length}
                          </span>
                        ) : undefined
                      }
                      onOpen={() => setDetailTxn(txn)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {rows.length > 0 ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-primary-200 bg-primary-50 px-4 py-3.5">
                <span className="text-sm font-bold text-primary-800">
                  Closing balance
                </span>
                <span className="text-sm font-bold tabular-nums text-primary-800">
                  {formatMoney(ledger.account.balance, currency)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Desktop / print: full statement table */}
          <div className="hidden overflow-x-auto md:block print:block">
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
                      className="border border-gray-200 px-3 py-8 text-center text-brand-stone"
                    >
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((txn, index) => {
                    const isDebit = txn.entryType === 'debit'
                    const signed = isDebit ? -txn.amount : txn.amount
                    const zebra = index % 2 === 1
                    return (
                      <tr
                        key={txn.id}
                        className={`cursor-pointer border border-gray-200 ${
                          zebra ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-primary-50/60`}
                        onClick={() => setDetailTxn(txn)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 text-gray-800">
                          {formatDisplayDate(txn.transactionDate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-800">
                          {txn.entryNumber}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          <span className="line-clamp-2">
                            {txn.narration || '—'}
                          </span>
                          {txn.attachments.length > 0 ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-brand-stone">
                              <Paperclip className="h-3 w-3" aria-hidden />
                              {txn.attachments.length}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className={`whitespace-nowrap px-3 py-2 font-semibold ${
                            isDebit ? 'text-red-700' : 'text-primary-700'
                          }`}
                        >
                          {isDebit ? 'Debit' : 'Credit'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800">
                          {formatMoney(signed, currency)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-800">
                          {formatMoney(txn.runningBalance, currency)}
                        </td>
                      </tr>
                    )
                  })
                )}

                {rows.length > 0 ? (
                  <tr className="border border-primary-200 bg-primary-50">
                    <td
                      colSpan={3}
                      className="px-3 py-3 text-sm font-bold text-primary-800"
                    >
                      Closing balance
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-primary-800">
                      {formatMoney(ledger.account.balance, currency)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 text-[11px] text-brand-stone sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-8">
          <span className="min-w-0 break-words">
            {ledger.businessName} — Confidential ledger export
          </span>
          <span className="shrink-0">{rows.length} entries</span>
        </footer>
      </div>

      {detailTxn ? (
        <div
          className={formModalOverlayClass}
          onClick={() => setDetailTxn(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-txn-detail-title"
        >
          <div
            className={`${formModalPanelClass} max-w-lg`}
            onClick={(e) => e.stopPropagation()}
          >
            <FormModalHeader
              titleId="share-txn-detail-title"
              title={
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">
                    Entry #{detailTxn.entryNumber}
                  </span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      detailTxn.entryType === 'debit'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-primary-100 text-primary-800'
                    }`}
                  >
                    {detailTxn.entryType}
                  </span>
                </span>
              }
              onClose={() => setDetailTxn(null)}
            />
            <FormModalBody>
              <dl className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Date
                    </dt>
                    <dd className="mt-0.5 text-brand-ink">
                      {formatDisplayDate(detailTxn.transactionDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Account
                    </dt>
                    <dd className="mt-0.5 truncate text-brand-ink">
                      {ledger.account.name || '—'}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Narration
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-gray-800">
                    {detailTxn.narration.trim() || '—'}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Amount
                    </dt>
                    <dd
                      className={`mt-0.5 font-medium tabular-nums ${
                        detailTxn.entryType === 'debit'
                          ? 'text-red-700'
                          : 'text-primary-700'
                      }`}
                    >
                      {detailTxn.entryType === 'debit' ? '−' : '+'}
                      {formatMoney(detailTxn.amount, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Running balance
                    </dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-brand-ink">
                      {formatMoney(detailTxn.runningBalance, currency)}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    Attachments
                    {detailTxn.attachments.length > 0
                      ? ` (${detailTxn.attachments.length})`
                      : ''}
                  </dt>
                  <dd className="mt-1.5">
                    {detailTxn.attachments.length > 0 ? (
                      <ul className="space-y-1.5">
                        {detailTxn.attachments.map((file) => (
                          <li key={file.id}>
                            <a
                              href={file.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-primary-700 hover:bg-primary-50"
                            >
                              <FileText className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="truncate">{file.fileName}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-brand-stone">
                        No attachments on this entry.
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            </FormModalBody>
            <FormModalFooter>
              <button
                type="button"
                onClick={() => setDetailTxn(null)}
                className={formModalSecondaryButtonClass}
              >
                Close
              </button>
            </FormModalFooter>
          </div>
        </div>
      ) : null}
    </main>
  )
}

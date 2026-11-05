'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Lock, Paperclip } from 'lucide-react'
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

/**
 * Public PIN-gated ledger preview for WhatsApp recipients.
 * Unlocked view mirrors the account ledger PDF statement layout.
 * URL: /share/ledger/{token}
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
  const [openId, setOpenId] = useState<string | null>(null)

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
    } catch {
      setUnlockError('Could not unlock. Try again.')
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
    <main className="min-h-screen bg-[#525659] py-4 sm:py-8 print:bg-white print:py-0">
      <div className="mx-auto w-full max-w-[840px] overflow-hidden rounded-sm bg-white shadow-2xl print:max-w-none print:shadow-none">
        {/* Brand bar — matches ledger PDF header */}
        <header className="flex items-center justify-between gap-3 bg-primary-600 px-4 py-3.5 text-white sm:px-8 sm:py-4">
          <div className="min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={ledger.businessName}
                className="h-8 max-w-[160px] object-contain sm:h-9"
              />
            ) : (
              <p className="truncate text-sm font-bold tracking-tight sm:text-base">
                {ledger.businessName}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide sm:text-xs">
              Account ledger
            </p>
            <p className="mt-0.5 text-[10px] text-primary-100 sm:text-[11px]">
              Exported {formatExportedOn()}
            </p>
          </div>
        </header>

        <div className="px-3 py-4 sm:px-8 sm:py-5">
          {/* Meta panel */}
          <section className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-3.5">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2 sm:text-[13px]">
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">Name</dt>
                <dd className="min-w-0 font-semibold text-brand-ink">
                  {ledger.account.name || '—'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">Phone</dt>
                <dd className="min-w-0 font-semibold text-brand-ink">
                  {ledger.account.phone || '—'}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">Currency</dt>
                <dd className="font-semibold text-brand-ink">{currency || '—'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">
                  Closing balance
                </dt>
                <dd className="font-semibold tabular-nums text-brand-ink">
                  {formatMoney(ledger.account.balance, currency)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">
                  Account type
                </dt>
                <dd className="font-semibold text-brand-ink">{accountTypeName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">Entries</dt>
                <dd className="font-semibold text-brand-ink">{rows.length}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">Cash type</dt>
                <dd className="font-semibold text-brand-ink">{cashTypeName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-[6.5rem] shrink-0 text-brand-stone">Document</dt>
                <dd className="font-semibold text-brand-ink">Ledger statement</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-gray-200 pt-2 text-[11px] text-brand-stone">
              Link valid until {formatExpiry(ledger.expiresAt)}
            </p>
          </section>

          <div className="my-4 border-t-[3px] border-primary-600 border-b border-b-gray-200 pb-0.5" />

          {/* Statement table */}
          <div className="-mx-3 overflow-x-auto sm:mx-0">
            <table className="min-w-[640px] w-full border-collapse text-left text-[12px] sm:text-[13px]">
              <thead>
                <tr className="bg-primary-600 text-white">
                  <th className="px-2 py-2.5 font-semibold sm:px-3">Date</th>
                  <th className="px-2 py-2.5 font-semibold sm:px-3">No.</th>
                  <th className="px-2 py-2.5 font-semibold sm:px-3">Narration</th>
                  <th className="px-2 py-2.5 font-semibold sm:px-3">Type</th>
                  <th className="px-2 py-2.5 text-right font-semibold sm:px-3">
                    Amount
                  </th>
                  <th className="px-2 py-2.5 text-right font-semibold sm:px-3">
                    Balance
                  </th>
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
                    const open = openId === txn.id
                    const isDebit = txn.entryType === 'debit'
                    const signed = isDebit ? -txn.amount : txn.amount
                    const zebra = index % 2 === 1
                    return (
                      <Fragment key={txn.id}>
                        <tr
                          className={`cursor-pointer border border-gray-200 ${
                            zebra ? 'bg-gray-50' : 'bg-white'
                          } hover:bg-primary-50/60`}
                          onClick={() => setOpenId(open ? null : txn.id)}
                        >
                          <td className="whitespace-nowrap px-2 py-2 text-gray-800 sm:px-3">
                            {formatDisplayDate(txn.transactionDate)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 tabular-nums text-gray-800 sm:px-3">
                            {txn.entryNumber}
                          </td>
                          <td className="max-w-[220px] px-2 py-2 text-gray-800 sm:max-w-none sm:px-3">
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
                            className={`whitespace-nowrap px-2 py-2 font-semibold sm:px-3 ${
                              isDebit ? 'text-red-700' : 'text-primary-700'
                            }`}
                          >
                            {isDebit ? 'Debit' : 'Credit'}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-gray-800 sm:px-3">
                            {formatMoney(signed, currency)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-gray-800 sm:px-3">
                            {formatMoney(txn.runningBalance, currency)}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="border border-gray-200 bg-primary-50/40">
                            <td colSpan={6} className="px-3 py-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-stone">
                                    Entry detail
                                  </p>
                                  <p className="mt-1 text-sm text-brand-ink">
                                    {txn.narration || '—'}
                                  </p>
                                </div>
                                {txn.attachments.length > 0 ? (
                                  <ul className="flex min-w-0 flex-1 flex-col gap-1.5 sm:items-end">
                                    {txn.attachments.map((file) => (
                                      <li key={file.id}>
                                        <a
                                          href={file.publicUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-primary-700 hover:bg-primary-50"
                                        >
                                          <FileText className="h-4 w-4 shrink-0" />
                                          <span className="truncate">
                                            {file.fileName}
                                          </span>
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-brand-stone">
                                    No attachments on this entry.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}

                {rows.length > 0 ? (
                  <tr className="border border-primary-200 bg-primary-50">
                    <td
                      colSpan={3}
                      className="px-2 py-3 text-sm font-bold text-primary-800 sm:px-3"
                    >
                      Closing balance
                    </td>
                    <td className="px-2 py-3 sm:px-3" />
                    <td className="px-2 py-3 sm:px-3" />
                    <td className="px-2 py-3 text-right text-sm font-bold tabular-nums text-primary-800 sm:px-3">
                      {formatMoney(ledger.account.balance, currency)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] text-brand-stone sm:hidden">
            Tip: swipe sideways to see Amount and Balance columns. Tap a row for
            attachments.
          </p>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-[11px] text-brand-stone sm:px-8">
          <span>
            {ledger.businessName} — Confidential ledger export
          </span>
          <span className="shrink-0">{rows.length} entries</span>
        </footer>
      </div>
    </main>
  )
}

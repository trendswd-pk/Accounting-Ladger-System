'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import SearchableSelect from '@/components/SearchableSelect'
import TransactionFormAttachments, {
  uploadPendingTransactionFiles,
} from '@/components/TransactionFormAttachments'
import { fetchAccounts, getCachedAccounts } from '@/lib/accounts'
import {
  fetchTransactions,
  getCachedTransactions,
  updateTransaction,
  type TransactionEntryType,
  type TransactionRecord,
} from '@/lib/transactions'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  return path
}

type TransactionEditFormPageProps = {
  transactionId: string
  returnTo?: string | null
}

export default function TransactionEditFormPage({
  transactionId,
  returnTo,
}: TransactionEditFormPageProps) {
  const router = useRouter()
  const [existing, setExisting] = useState<TransactionRecord | null>(() =>
    getCachedTransactions()?.find((t) => t.id === transactionId) ?? null
  )
  const [accounts, setAccounts] = useState(() => getCachedAccounts() ?? [])
  const [ready, setReady] = useState(() => existing != null)
  const [transactionDate, setTransactionDate] = useState(
    () => existing?.transactionDate ?? ''
  )
  const [accountId, setAccountId] = useState(() => existing?.accountId ?? '')
  const [narration, setNarration] = useState(() => existing?.narration ?? '')
  const [entryType, setEntryType] = useState<TransactionEntryType | ''>(
    () => existing?.entryType ?? ''
  )
  const [balance, setBalance] = useState(() =>
    existing ? String(existing.balance) : ''
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const leaveTo =
    safeReturnPath(returnTo) ?? `/transactions/${transactionId}`
  const leave = useCallback(() => router.push(leaveTo), [router, leaveTo])

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  )

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [txs, accs] = await Promise.all([
        fetchTransactions(),
        fetchAccounts(),
      ])
      setAccounts(accs)
      const found = txs.find((t) => t.id === transactionId) ?? null
      setExisting(found)
      if (found) {
        setTransactionDate(found.transactionDate)
        setAccountId(found.accountId)
        setNarration(found.narration)
        setEntryType(found.entryType)
        setBalance(String(found.balance))
      } else {
        setLoadError('Transaction not found.')
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [transactionId])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transactionDate) {
      setFormError('Transaction date is required.')
      return
    }
    const narrationTrim = narration.trim()
    if (!narrationTrim) {
      setFormError('Narration is required.')
      return
    }
    if (!accountId) {
      setFormError('Account is required.')
      return
    }
    if (entryType !== 'credit' && entryType !== 'debit') {
      setFormError('Type is required. Select Credit or Debit.')
      return
    }
    const balanceTrim = balance.trim()
    if (!balanceTrim) {
      setFormError('Balance is required.')
      return
    }
    const balanceNum = Number(balanceTrim)
    if (!Number.isFinite(balanceNum) || balanceNum < 0) {
      setFormError('Balance must be a valid number.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      await updateTransaction(transactionId, {
        transactionDate,
        accountId,
        narration: narrationTrim,
        entryType,
        balance: Math.abs(balanceNum),
      })
      const filesToUpload = pendingFiles
      setPendingFiles([])
      if (filesToUpload.length > 0) {
        void uploadPendingTransactionFiles([transactionId], filesToUpload).catch(
          () => {}
        )
      }
      router.push(leaveTo)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-6 h-8 w-52 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
      </div>
    )
  }

  if (loadError || !existing) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={leave}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Edit Transaction
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {loadError || 'Transaction not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={leave}
            disabled={submitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl">
            Edit Transaction
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
              aria-label="About Edit Transaction"
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
                  className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Update this ledger entry. Attachments upload after you save.
                </div>
              </>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={leave}
          disabled={submitting}
          className="inline-flex h-10 shrink-0 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>

      {formError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {formError}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
      >
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Entry details
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Required fields are marked with *.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div>
            <label
              htmlFor="txn-date"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Transaction Date <span className="text-red-500">*</span>
            </label>
            <input
              id="txn-date"
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="txn-account"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Account Name <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              id="txn-account"
              required
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
              placeholder="Search account…"
              emptyMessage={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="txn-narration"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Narration <span className="text-red-500">*</span>
            </label>
            <textarea
              id="txn-narration"
              required
              rows={3}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className={inputClass}
              placeholder="Enter details…"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-2" role="group" aria-label="Entry type">
              {(['credit', 'debit'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={entryType === option}
                  onClick={() => setEntryType(option)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    entryType === option
                      ? option === 'credit'
                        ? 'border-green-600 bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : 'border-red-600 bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="txn-balance"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Balance <span className="text-red-500">*</span>
            </label>
            <input
              id="txn-balance"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              required
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className={inputClass}
              placeholder="Enter amount"
            />
          </div>
          <TransactionFormAttachments
            inputId="txn-edit-attachments"
            files={pendingFiles}
            onChange={setPendingFiles}
            disabled={submitting}
            existingTransactionId={transactionId}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
          <button
            type="button"
            onClick={leave}
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

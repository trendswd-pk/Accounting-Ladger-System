'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalOverlayClass,
  formModalPanelClass,
  formModalPrimaryButtonClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import SearchableSelect from '@/components/SearchableSelect'
import TransactionFormAttachments, {
  uploadPendingTransactionFiles,
} from '@/components/TransactionFormAttachments'
import { fetchAccounts, getCachedAccounts } from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  getCachedAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  createTransaction,
  createTransfer,
  type TransactionEntryType,
} from '@/lib/transactions'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

type FormMode = DefaultEntryMode

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type TransactionFormModalProps = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  /** `page` = full route layout (e.g. /newentry); `modal` = overlay popup. */
  presentation?: 'modal' | 'page'
}

export default function TransactionFormModal({
  open,
  onClose,
  onSaved,
  presentation = 'modal',
}: TransactionFormModalProps) {
  const isPage = presentation === 'page'
  const [accounts, setAccounts] = useState(() => getCachedAccounts() ?? [])
  const [defaultEntryMode, setDefaultEntryMode] = useState<FormMode>(
    () => getCachedAppSettings()?.defaultEntryMode ?? DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [formMode, setFormMode] = useState<FormMode>(defaultEntryMode)
  const [transactionDate, setTransactionDate] = useState(() => todayISO())
  const [accountId, setAccountId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [narration, setNarration] = useState('')
  const [entryType, setEntryType] = useState<TransactionEntryType | ''>('')
  const [balance, setBalance] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts]
  )

  const loadAccounts = useCallback(async () => {
    const items = await fetchAccounts()
    setAccounts(items)
  }, [])

  const resetForm = useCallback((mode: FormMode) => {
    setFormError(null)
    setFormMode(mode)
    setTransactionDate(todayISO())
    setAccountId('')
    setFromAccountId('')
    setToAccountId('')
    setNarration('')
    setEntryType('')
    setBalance('')
    setPendingFiles([])
  }, [])

  useEffect(() => {
    if (!isPage && !open) return
    let cancelled = false
    void (async () => {
      try {
        const cached = getCachedAppSettings()
        const s = cached ?? (await fetchAppSettings())
        if (cancelled) return
        setDefaultEntryMode(s.defaultEntryMode)
        resetForm(s.defaultEntryMode)
      } catch {
        if (!cancelled) resetForm(defaultEntryMode)
      }
      try {
        await loadAccounts()
      } catch {
        /* keep cached */
      }
    })()
    return () => {
      cancelled = true
    }
    // intentionally only when opened / page mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPage])

  const close = () => {
    if (submitting) return
    onClose()
    setFormError(null)
  }

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
    const amount = Math.abs(balanceNum)
    const isTransfer = formMode === 'transfer'

    if (isTransfer) {
      if (!fromAccountId) {
        setFormError('From account (out) is required.')
        return
      }
      if (!toAccountId) {
        setFormError('To account (in) is required.')
        return
      }
      if (fromAccountId === toAccountId) {
        setFormError('From and To accounts must be different.')
        return
      }
    } else {
      if (!accountId) {
        setFormError('Account is required.')
        return
      }
      if (entryType !== 'credit' && entryType !== 'debit') {
        setFormError('Type is required. Select Credit or Debit.')
        return
      }
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const uploadIds: string[] = []
      if (isTransfer) {
        const { debit, credit } = await createTransfer({
          transactionDate,
          fromAccountId,
          toAccountId,
          narration: narrationTrim,
          balance: amount,
        })
        uploadIds.push(debit.id, credit.id)
      } else {
        const item = await createTransaction({
          transactionDate,
          accountId,
          narration: narrationTrim,
          entryType: entryType as TransactionEntryType,
          balance: amount,
        })
        uploadIds.push(item.id)
      }
      const filesToUpload = pendingFiles
      setPendingFiles([])
      setSubmitting(false)
      onClose()
      onSaved?.()
      // Files + any extra refresh stay off the critical save path.
      if (filesToUpload.length > 0) {
        void uploadPendingTransactionFiles(uploadIds, filesToUpload).catch(() => {})
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
      setSubmitting(false)
    }
  }

  if (!isPage && !open) return null

  const formFields = (
    <>
      {formError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {formError}
        </div>
      ) : null}
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Entry Mode
          </span>
          <div className="flex gap-2" role="group" aria-label="Entry mode">
            {(
              [
                { id: 'normal', label: 'Normal Entry' },
                { id: 'transfer', label: 'Transfer' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={formMode === option.id}
                onClick={() => {
                  setFormMode(option.id)
                  setFormError(null)
                  if (option.id === 'transfer') {
                    setAccountId('')
                    setEntryType('')
                  } else {
                    setFromAccountId('')
                    setToAccountId('')
                  }
                }}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  formMode === option.id
                    ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor="dash-txn-date"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Transaction Date <span className="text-red-500">*</span>
          </label>
          <input
            id="dash-txn-date"
            type="date"
            required
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {formMode === 'transfer' ? (
          <>
            <div>
              <label
                htmlFor="dash-txn-to-account"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                To Account (In) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                key="dash-to-account"
                id="dash-txn-to-account"
                required
                value={toAccountId}
                onChange={(id) => {
                  setToAccountId(id)
                  if (id && id === fromAccountId) setFromAccountId('')
                }}
                options={accountOptions.filter((o) => o.value !== fromAccountId)}
                placeholder="Search to account…"
                emptyMessage={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                Saved as Credit on this account
              </p>
            </div>
            <div>
              <label
                htmlFor="dash-txn-from-account"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                From Account (Out) <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                key="dash-from-account"
                id="dash-txn-from-account"
                required
                value={fromAccountId}
                onChange={(id) => {
                  setFromAccountId(id)
                  if (id && id === toAccountId) setToAccountId('')
                }}
                options={accountOptions.filter((o) => o.value !== toAccountId)}
                placeholder="Search from account…"
                emptyMessage={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Saved as Debit on this account
              </p>
            </div>
          </>
        ) : (
          <div>
            <label
              htmlFor="dash-txn-account"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Account Name <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              key="dash-add-account"
              id="dash-txn-account"
              required
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
              placeholder="Search account…"
              emptyMessage={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
              className={inputClass}
            />
          </div>
        )}

        {accounts.length === 0 ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No accounts yet. Add them under Accounts first.
          </p>
        ) : null}

        <div>
          <label
            htmlFor="dash-txn-narration"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Narration <span className="text-red-500">*</span>
          </label>
          <textarea
            id="dash-txn-narration"
            required
            rows={3}
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className={inputClass}
            placeholder="Enter details…"
          />
        </div>

        {formMode === 'normal' ? (
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
        ) : null}

        <div>
          <label
            htmlFor="dash-txn-balance"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Balance <span className="text-red-500">*</span>
          </label>
          <input
            id="dash-txn-balance"
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
          inputId="dash-txn-attachments"
          files={pendingFiles}
          onChange={setPendingFiles}
          disabled={submitting}
        />
      </div>
    </>
  )

  if (isPage) {
    return (
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6 lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1
                id="newentry-page-title"
                className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:text-3xl"
              >
                Add Transaction
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
                  aria-label="About Add Transaction"
                  aria-expanded={infoOpen}
                  aria-controls="newentry-info-popover"
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
                      id="newentry-info-popover"
                      role="dialog"
                      className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Create a ledger entry or transfer between accounts.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="inline-flex h-10 shrink-0 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>

        <form
          id="dashboard-transaction-form"
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
          <div className="px-4 py-4 sm:px-6">{formFields}</div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div
      className={formModalOverlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-transaction-modal-title"
    >
      <div className={`${formModalPanelClass} max-w-md`}>
        <FormModalHeader
          titleId="dashboard-transaction-modal-title"
          title="Add Transaction"
          onClose={close}
        />
        <FormModalBody>
          <form
            id="dashboard-transaction-form"
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4"
          >
            {formFields}
          </form>
        </FormModalBody>
        <FormModalFooter>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className={formModalSecondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="dashboard-transaction-form"
            disabled={submitting}
            className={formModalPrimaryButtonClass}
          >
            {submitting ? 'Saving…' : 'Add'}
          </button>
        </FormModalFooter>
      </div>
    </div>
  )
}

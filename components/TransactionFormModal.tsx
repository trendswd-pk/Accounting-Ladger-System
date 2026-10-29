'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { fetchAccounts, getCachedAccounts } from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  getCachedAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  createTransaction,
  invalidateTransactionsCache,
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
}

export default function TransactionFormModal({
  open,
  onClose,
  onSaved,
}: TransactionFormModalProps) {
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
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
  }, [])

  useEffect(() => {
    if (!open) return
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
    // intentionally only when opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
      if (isTransfer) {
        await createTransaction({
          transactionDate,
          accountId: fromAccountId,
          narration: narrationTrim,
          entryType: 'debit',
          balance: amount,
        })
        await createTransaction({
          transactionDate,
          accountId: toAccountId,
          narration: narrationTrim,
          entryType: 'credit',
          balance: amount,
        })
      } else {
        await createTransaction({
          transactionDate,
          accountId,
          narration: narrationTrim,
          entryType: entryType as TransactionEntryType,
          balance: amount,
        })
      }
      invalidateTransactionsCache()
      onClose()
      onSaved?.()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className={formModalOverlayClass}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-transaction-modal-title"
    >
      <div className={`${formModalPanelClass} max-w-md`} onClick={(e) => e.stopPropagation()}>
        <FormModalHeader
          titleId="dashboard-transaction-modal-title"
          title="Add Transaction"
          onClose={close}
        />
        <FormModalBody>
          {formError ? (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {formError}
            </div>
          ) : null}
          <form
            id="dashboard-transaction-form"
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-4"
          >
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
          </form>
        </FormModalBody>
        <FormModalFooter>
          <button
            type="submit"
            form="dashboard-transaction-form"
            disabled={submitting}
            className={formModalPrimaryButtonClass}
          >
            {submitting ? 'Saving…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className={formModalSecondaryButtonClass}
          >
            Cancel
          </button>
        </FormModalFooter>
      </div>
    </div>
  )
}

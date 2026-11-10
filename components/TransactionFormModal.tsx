'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, FileEdit, Info, Plus, Rows3, Trash2 } from 'lucide-react'
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
  createTransactions,
  createTransfer,
  type TransactionEntryType,
  type TransactionInput,
} from '@/lib/transactions'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

const multiCellClass =
  'w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

type FormMode = DefaultEntryMode

type MultiSide = 'D' | 'C' | ''

type MultiLine = {
  key: string
  side: MultiSide
  accountId: string
  debit: string
  credit: string
  shortNarration: string
}

const MULTI_STARTER_ROWS = 2
const MULTI_MAX_ROWS = 40

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function newMultiLine(): MultiLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    side: '',
    accountId: '',
    debit: '',
    credit: '',
    shortNarration: '',
  }
}

/** short only | long only | `short - long` when both filled */
function combineMultiNarration(short: string, long: string): string {
  const s = short.trim()
  const l = long.trim()
  if (s && l) return `${s} - ${l}`
  return s || l
}

function starterMultiLines(count = MULTI_STARTER_ROWS): MultiLine[] {
  return Array.from({ length: count }, () => newMultiLine())
}

function parseAmount(raw: string): number {
  const n = Number(String(raw).trim())
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.abs(n)
}

function amountsMatch(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100)
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Plain numeric string for amount inputs (editable after auto-fill). */
function formatAmountInput(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return ''
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

/** How much is still needed on Debit or Credit to balance other rows. */
function balancingAmountForSide(
  lines: MultiLine[],
  excludeKey: string,
  side: 'D' | 'C'
): number {
  let debit = 0
  let credit = 0
  for (const line of lines) {
    if (line.key === excludeKey) continue
    debit += parseAmount(line.debit)
    credit += parseAmount(line.credit)
  }
  if (side === 'D') {
    const need = credit - debit
    return need > 0 ? need : 0
  }
  const need = debit - credit
  return need > 0 ? need : 0
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
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [defaultEntryMode, setDefaultEntryMode] = useState<FormMode>(
    () => getCachedAppSettings()?.defaultEntryMode ?? DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [formMode, setFormMode] = useState<FormMode>(defaultEntryMode)
  const [transactionDate, setTransactionDate] = useState(() => todayISO())
  const [accountId, setAccountId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [narration, setNarration] = useState('')
  const [longNarration, setLongNarration] = useState('')
  const [multiLines, setMultiLines] = useState<MultiLine[]>(() => starterMultiLines())
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

  const multiTotals = useMemo(() => {
    let debit = 0
    let credit = 0
    let filled = 0
    let validFilled = 0
    let validWithShort = 0
    let active = 0
    let activeWithShort = 0
    for (const line of multiLines) {
      const debitAmt = parseAmount(line.debit)
      const creditAmt = parseAmount(line.credit)
      debit += debitAmt
      credit += creditAmt
      const hasShort = Boolean(line.shortNarration.trim())
      const hasAny =
        Boolean(line.side) ||
        Boolean(line.accountId) ||
        debitAmt > 0 ||
        creditAmt > 0 ||
        hasShort
      if (!hasAny) continue
      filled += 1
      active += 1
      if (hasShort) activeWithShort += 1
      const amountOk =
        line.accountId &&
        ((line.side === 'D' && debitAmt > 0 && creditAmt <= 0) ||
          (line.side === 'C' && creditAmt > 0 && debitAmt <= 0))
      if (amountOk) {
        validFilled += 1
        if (hasShort) validWithShort += 1
      }
    }
    const allValidHaveShort = validFilled > 0 && validWithShort === validFilled
    return {
      debit,
      credit,
      filled,
      validFilled,
      validWithShort,
      allValidHaveShort,
      // UI: shared Narration becomes optional once any line has short narration.
      anyActiveHaveShort: activeWithShort > 0,
      balanced: amountsMatch(debit, credit) && debit > 0,
    }
  }, [multiLines])

  const multiLongFilled = Boolean(longNarration.trim())
  const multiShortRequired = !multiLongFilled
  // Shared Narration * drops as soon as any row short narration is filled.
  const multiLongRequired = !multiLongFilled && !multiTotals.anyActiveHaveShort

  const canSubmit = useMemo(() => {
    if (submitting) return false
    if (!transactionDate.trim()) return false

    if (formMode === 'multi') {
      if (multiTotals.validFilled < 2) return false
      if (multiTotals.validFilled !== multiTotals.filled) return false
      if (!multiTotals.balanced) return false
      // Narration: shared long, or every valid row short (or both).
      if (!multiLongFilled && !multiTotals.allValidHaveShort) return false
      return true
    }

    if (!narration.trim()) return false
    const balanceNum = Number(balance.trim())
    if (!balance.trim() || !Number.isFinite(balanceNum) || balanceNum < 0) return false

    if (formMode === 'transfer') {
      return Boolean(fromAccountId && toAccountId && fromAccountId !== toAccountId)
    }

    return Boolean(accountId && (entryType === 'credit' || entryType === 'debit'))
  }, [
    submitting,
    transactionDate,
    formMode,
    multiLongFilled,
    multiTotals,
    narration,
    balance,
    fromAccountId,
    toAccountId,
    accountId,
    entryType,
  ])

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
    setLongNarration('')
    setMultiLines(starterMultiLines())
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
        setCurrency(s.currency || DEFAULT_APP_SETTINGS.currency)
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

  const updateMultiLine = (key: string, patch: Partial<MultiLine>) => {
    setMultiLines((rows) => {
      const next = rows.map((row) => (row.key === key ? { ...row, ...patch } : row))
      const last = next[next.length - 1]
      const lastUsed =
        last &&
        (last.accountId || parseAmount(last.debit) > 0 || parseAmount(last.credit) > 0)
      if (lastUsed && next.length < MULTI_MAX_ROWS) {
        return [...next, newMultiLine()]
      }
      return next
    })
  }

  const removeMultiLine = (key: string) => {
    setMultiLines((rows) => {
      const next = rows.filter((row) => row.key !== key)
      return next.length >= 2 ? next : starterMultiLines(2)
    })
  }

  const switchMode = (mode: FormMode) => {
    setFormMode(mode)
    setFormError(null)
    setAccountId('')
    setFromAccountId('')
    setToAccountId('')
    setEntryType('')
    setBalance('')
    setNarration('')
    setLongNarration('')
    setMultiLines(starterMultiLines())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transactionDate) {
      setFormError('Transaction date is required.')
      return
    }

    if (formMode === 'multi') {
      const longTrim = longNarration.trim()

      const prepared: TransactionInput[] = []
      for (let i = 0; i < multiLines.length; i++) {
        const line = multiLines[i]!
        const debitAmt = parseAmount(line.debit)
        const creditAmt = parseAmount(line.credit)
        const shortTrim = line.shortNarration.trim()
        const hasAny =
          Boolean(line.side) ||
          Boolean(line.accountId) ||
          debitAmt > 0 ||
          creditAmt > 0 ||
          Boolean(shortTrim)

        if (!hasAny) continue

        if (!line.side) {
          setFormError(`Row ${i + 1}: select D (debit) or C (credit).`)
          return
        }
        if (!line.accountId) {
          setFormError(`Row ${i + 1}: account is required.`)
          return
        }
        if (line.side === 'D') {
          if (debitAmt <= 0) {
            setFormError(`Row ${i + 1}: debit amount is required.`)
            return
          }
        } else if (creditAmt <= 0) {
          setFormError(`Row ${i + 1}: credit amount is required.`)
          return
        }

        const narrationCombined = combineMultiNarration(shortTrim, longTrim)
        if (!narrationCombined) {
          setFormError(
            'Add short narration on each line, or fill the shared Narration (or both).'
          )
          return
        }

        prepared.push({
          transactionDate,
          accountId: line.accountId,
          narration: narrationCombined,
          entryType: line.side === 'D' ? 'debit' : 'credit',
          balance: line.side === 'D' ? debitAmt : creditAmt,
        })
      }

      if (prepared.length < 2) {
        setFormError('Add at least two lines (debit and credit) that balance.')
        return
      }

      const debitTotal = prepared
        .filter((p) => p.entryType === 'debit')
        .reduce((sum, p) => sum + p.balance, 0)
      const creditTotal = prepared
        .filter((p) => p.entryType === 'credit')
        .reduce((sum, p) => sum + p.balance, 0)

      if (!amountsMatch(debitTotal, creditTotal)) {
        setFormError(
          `Debit and credit totals must match before saving (${formatMoney(debitTotal)} vs ${formatMoney(creditTotal)}).`
        )
        return
      }
      if (debitTotal <= 0) {
        setFormError('Totals must be greater than zero.')
        return
      }

      setSubmitting(true)
      setFormError(null)
      try {
        const items = await createTransactions(prepared)
        const uploadIds = items.map((item) => item.id)
        const filesToUpload = pendingFiles
        setPendingFiles([])
        setSubmitting(false)
        onClose()
        onSaved?.()
        if (filesToUpload.length > 0) {
          void uploadPendingTransactionFiles(uploadIds, filesToUpload).catch(() => {})
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Save failed')
        setSubmitting(false)
      }
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
      if (filesToUpload.length > 0) {
        void uploadPendingTransactionFiles(uploadIds, filesToUpload).catch(() => {})
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
      setSubmitting(false)
    }
  }

  if (!isPage && !open) return null

  const entryModeButtons = (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Entry Mode <span className="text-red-500">*</span>
      </span>
      <div
        className="grid grid-cols-3 gap-2"
        role="group"
        aria-label="Entry mode"
      >
        {(
          [
            {
              id: 'normal' as const,
              label: 'Normal',
              fullLabel: 'Normal Entry',
              Icon: FileEdit,
            },
            {
              id: 'transfer' as const,
              label: 'Transfer',
              fullLabel: 'Transfer',
              Icon: ArrowLeftRight,
            },
            {
              id: 'multi' as const,
              label: 'Multi',
              fullLabel: 'Multi Transaction',
              Icon: Rows3,
            },
          ] as const
        ).map((option) => {
          const Icon = option.Icon
          const selected = formMode === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              aria-label={option.fullLabel}
              title={option.fullLabel}
              onClick={() => switchMode(option.id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-2 text-center transition-colors sm:flex-row sm:gap-2 sm:px-3 ${
                selected
                  ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate text-[11px] font-medium leading-tight sm:text-sm">
                <span className="sm:hidden">{option.label}</span>
                <span className="hidden sm:inline">{option.fullLabel}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  const dateField = (
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
  )

  const amountInputClass = `${multiCellClass} text-right tabular-nums disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-900/50 dark:disabled:text-gray-500`

  const setMultiSide = (key: string, side: MultiSide) => {
    setMultiLines((rows) => {
      const current = rows.find((row) => row.key === key)
      if (!current) return rows

      let debit = current.debit
      let credit = current.credit
      if (side === 'D') {
        credit = ''
        // Auto-fill balancing debit when empty (user can still edit).
        if (!debit.trim()) {
          debit = formatAmountInput(balancingAmountForSide(rows, key, 'D'))
        }
      } else if (side === 'C') {
        debit = ''
        if (!credit.trim()) {
          credit = formatAmountInput(balancingAmountForSide(rows, key, 'C'))
        }
      } else {
        debit = ''
        credit = ''
      }

      const next = rows.map((row) =>
        row.key === key ? { ...row, side, debit, credit } : row
      )
      const last = next[next.length - 1]
      const lastUsed =
        last &&
        (last.side ||
          last.accountId ||
          parseAmount(last.debit) > 0 ||
          parseAmount(last.credit) > 0)
      if (lastUsed && next.length < MULTI_MAX_ROWS) {
        return [...next, newMultiLine()]
      }
      return next
    })
  }

  const multiSideMeta = (line: MultiLine) => {
    const side = line.side
    const tint =
      side === 'D'
        ? 'bg-red-50 dark:bg-red-900/25'
        : side === 'C'
          ? 'bg-primary-50 dark:bg-primary-900/25'
          : 'bg-white dark:bg-gray-800/60'
    const edge =
      side === 'D'
        ? 'border-l-red-500'
        : side === 'C'
          ? 'border-l-primary-600'
          : 'border-l-transparent'
    return { side, tint, edge }
  }

  const renderDcToggle = (line: MultiLine, index: number) => (
    <div className="flex gap-0.5" role="group" aria-label={`Row ${index + 1} debit or credit`}>
      {(['D', 'C'] as const).map((code) => {
        const active = line.side === code
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setMultiSide(line.key, active ? '' : code)}
            className={`h-8 w-8 rounded text-xs font-semibold ${
              active
                ? code === 'D'
                  ? 'border border-red-600 bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  : 'border border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                : 'border border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            {code}
          </button>
        )
      })}
    </div>
  )

  const multiTotalsBar = (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
        <span>
          Totals ({currency})
          {!multiTotals.balanced && multiTotals.debit + multiTotals.credit > 0 ? (
            <span className="ml-2 font-medium text-red-600 dark:text-red-400">
              Must match to save
            </span>
          ) : multiTotals.balanced ? (
            <span className="ml-2 font-medium text-primary-700 dark:text-primary-400">
              Balanced
            </span>
          ) : null}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-2 text-sm font-semibold tabular-nums">
        <div className="rounded-md bg-red-50 px-2.5 py-1.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
            Debit
          </span>
          {formatMoney(multiTotals.debit)}
        </div>
        <div className="rounded-md bg-primary-50 px-2.5 py-1.5 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
          <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
            Credit
          </span>
          {formatMoney(multiTotals.credit)}
        </div>
      </div>
    </div>
  )

  const multiGrid = (
    <div className="space-y-3">
      {/* Mobile: stacked entry cards */}
      <div className="space-y-3 md:hidden">
        {multiLines.map((line, index) => {
          const { side, tint, edge } = multiSideMeta(line)
          const debitEnabled = side === 'D'
          const creditEnabled = side === 'C'
          return (
            <div
              key={line.key}
              className={`rounded-xl border border-gray-200 border-l-4 p-3 shadow-sm dark:border-gray-700 ${tint} ${edge}`}
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {renderDcToggle(line, index)}
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Line {index + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeMultiLine(line.key)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  aria-label={`Remove row ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Account <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                key={`multi-account-m-${line.key}`}
                id={`dash-multi-account-m-${line.key}`}
                value={line.accountId}
                onChange={(id) => updateMultiLine(line.key, { accountId: id })}
                options={accountOptions}
                placeholder="Account…"
                emptyMessage={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
                className={multiCellClass}
              />

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor={`dash-multi-debit-m-${line.key}`}
                    className="mb-1 block text-xs font-medium text-red-700 dark:text-red-400"
                  >
                    Debit {debitEnabled ? <span className="text-red-500">*</span> : null}
                  </label>
                  <input
                    id={`dash-multi-debit-m-${line.key}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={line.debit}
                    disabled={!debitEnabled}
                    onChange={(e) =>
                      updateMultiLine(line.key, {
                        debit: e.target.value,
                        credit: '',
                        side: 'D',
                      })
                    }
                    className={amountInputClass}
                    placeholder={debitEnabled ? '0.00' : 'Select D'}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`dash-multi-credit-m-${line.key}`}
                    className="mb-1 block text-xs font-medium text-primary-700 dark:text-primary-400"
                  >
                    Credit {creditEnabled ? <span className="text-red-500">*</span> : null}
                  </label>
                  <input
                    id={`dash-multi-credit-m-${line.key}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={line.credit}
                    disabled={!creditEnabled}
                    onChange={(e) =>
                      updateMultiLine(line.key, {
                        credit: e.target.value,
                        debit: '',
                        side: 'C',
                      })
                    }
                    className={amountInputClass}
                    placeholder={creditEnabled ? '0.00' : 'Select C'}
                  />
                </div>
              </div>

              <label
                htmlFor={`dash-multi-short-m-${line.key}`}
                className="mb-1 mt-2.5 block text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Short narration{' '}
                {multiShortRequired ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="font-normal text-gray-400">(optional)</span>
                )}
              </label>
              <input
                id={`dash-multi-short-m-${line.key}`}
                type="text"
                value={line.shortNarration}
                onChange={(e) =>
                  updateMultiLine(line.key, { shortNarration: e.target.value })
                }
                className={multiCellClass}
                placeholder={
                  multiLongFilled
                    ? 'Optional — shared narration applies'
                    : 'Required for this line'
                }
              />
            </div>
          )
        })}
        {multiTotalsBar}
      </div>

      {/* Desktop: journal table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 md:block">
        <table className="min-w-[44rem] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              <th className="w-16 px-2 py-2">
                D/C <span className="text-red-500">*</span>
              </th>
              <th className="min-w-[12rem] px-2 py-2">
                Account <span className="text-red-500">*</span>
              </th>
              <th className="w-28 px-2 py-2 text-right">
                Debit <span className="text-red-500">*</span>
              </th>
              <th className="w-28 px-2 py-2 text-right">
                Credit <span className="text-red-500">*</span>
              </th>
              <th className="min-w-[10rem] px-2 py-2">
                Short narration{' '}
                {multiShortRequired ? <span className="text-red-500">*</span> : null}
              </th>
              <th className="w-10 px-1 py-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {multiLines.map((line, index) => {
              const { side, tint, edge } = multiSideMeta(line)
              const debitEnabled = side === 'D'
              const creditEnabled = side === 'C'
              return (
                <tr key={line.key} className={`${tint} border-l-2 ${edge}`}>
                  <td className="px-2 py-1.5 align-middle">{renderDcToggle(line, index)}</td>
                  <td className="px-2 py-1.5 align-middle">
                    <SearchableSelect
                      key={`multi-account-${line.key}`}
                      id={`dash-multi-account-${line.key}`}
                      value={line.accountId}
                      onChange={(id) => updateMultiLine(line.key, { accountId: id })}
                      options={accountOptions}
                      placeholder="Account…"
                      emptyMessage={accounts.length === 0 ? 'No accounts yet' : 'No matches'}
                      className={multiCellClass}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={line.debit}
                      disabled={!debitEnabled}
                      onChange={(e) =>
                        updateMultiLine(line.key, {
                          debit: e.target.value,
                          credit: '',
                          side: 'D',
                        })
                      }
                      className={amountInputClass}
                      placeholder={debitEnabled ? '0.00' : '—'}
                      aria-label={`Row ${index + 1} debit`}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={line.credit}
                      disabled={!creditEnabled}
                      onChange={(e) =>
                        updateMultiLine(line.key, {
                          credit: e.target.value,
                          debit: '',
                          side: 'C',
                        })
                      }
                      className={amountInputClass}
                      placeholder={creditEnabled ? '0.00' : '—'}
                      aria-label={`Row ${index + 1} credit`}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-middle">
                    <input
                      type="text"
                      value={line.shortNarration}
                      onChange={(e) =>
                        updateMultiLine(line.key, { shortNarration: e.target.value })
                      }
                      className={multiCellClass}
                      placeholder={multiLongFilled ? 'Optional' : 'Required'}
                      aria-label={`Row ${index + 1} short narration`}
                    />
                  </td>
                  <td className="px-1 py-1.5 align-middle">
                    <button
                      type="button"
                      onClick={() => removeMultiLine(line.key)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      aria-label={`Remove row ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50 font-semibold dark:border-gray-700 dark:bg-gray-900/40">
              <td colSpan={2} className="px-2 py-2 text-xs text-gray-600 dark:text-gray-300">
                Totals ({currency})
                {!multiTotals.balanced && multiTotals.debit + multiTotals.credit > 0 ? (
                  <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                    Must match to save
                  </span>
                ) : multiTotals.balanced ? (
                  <span className="ml-2 font-medium text-primary-700 dark:text-primary-400">
                    Balanced
                  </span>
                ) : null}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-red-700 dark:text-red-400">
                {formatMoney(multiTotals.debit)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-primary-700 dark:text-primary-400">
                {formatMoney(multiTotals.credit)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        onClick={() =>
          setMultiLines((rows) =>
            rows.length >= MULTI_MAX_ROWS ? rows : [...rows, newMultiLine()]
          )
        }
        disabled={multiLines.length >= MULTI_MAX_ROWS}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 md:w-auto"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add row
      </button>

      <div>
        <label
          htmlFor="dash-txn-long-narration"
          className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Narration{' '}
          {multiLongRequired ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="font-normal text-gray-400">(optional)</span>
          )}
        </label>
        <textarea
          id="dash-txn-long-narration"
          required={multiLongRequired}
          rows={3}
          value={longNarration}
          onChange={(e) => setLongNarration(e.target.value)}
          className={inputClass}
          placeholder={
            multiLongRequired
              ? 'Required — or fill short narration on a line to make this optional…'
              : 'Optional — with short text, saved as “short - narration”…'
          }
        />
      </div>
    </div>
  )

  const formFields = (
    <>
      {formError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {formError}
        </div>
      ) : null}
      <div className="space-y-4">
        {entryModeButtons}
        {dateField}

        {formMode === 'multi' ? (
          multiGrid
        ) : formMode === 'transfer' ? (
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

        {formMode !== 'multi' ? (
          <>
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
          </>
        ) : null}

        <TransactionFormAttachments
          inputId="dash-txn-attachments"
          files={pendingFiles}
          onChange={setPendingFiles}
          disabled={submitting}
          shareAcrossEntries={formMode === 'transfer' || formMode === 'multi'}
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
                      className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Create a ledger entry, transfer, or multi-line journal. Multi saves
                      only when debit and credit totals match.
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
              disabled={!canSubmit}
              className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving…' : formMode === 'multi' ? 'Save entries' : 'Add'}
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
      <div
        className={`${formModalPanelClass} ${
          formMode === 'multi' ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
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
            disabled={!canSubmit}
            className={formModalPrimaryButtonClass}
          >
            {submitting ? 'Saving…' : formMode === 'multi' ? 'Save entries' : 'Add'}
          </button>
        </FormModalFooter>
      </div>
    </div>
  )
}

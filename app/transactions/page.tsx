'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Filter, Info, Plus, Search, X } from 'lucide-react'
import ActionsDropdown from '@/components/ActionsDropdown'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalDangerButtonClass,
  formModalOverlayClass,
  formModalPanelClass,
  formModalPrimaryButtonClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import SearchableSelect from '@/components/SearchableSelect'
import { TablePaginationNav } from '@/components/TablePaginationNav'
import TransactionDocumentsPanel from '@/components/TransactionDocumentsPanel'
import { fetchAccounts, getCachedAccounts, type AccountRecord } from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  fillMessageTemplate,
  openWhatsAppMessage,
  transactionMessageVars,
} from '@/lib/messageTemplates'
import { formatMoney } from '@/lib/money'
import { exportTransactionPdf } from '@/lib/transactionExport'
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  getCachedTransactions,
  signedTransactionAmount,
  updateTransaction,
  type TransactionEntryType,
  type TransactionRecord,
} from '@/lib/transactions'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from '@/lib/tablePagination'

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

function formatDisplayDate(iso: string): string {
  const raw = String(iso ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || '—'
  const [y, m, d] = raw.split('-')
  return `${d}-${m}-${y}`
}

function entryTypeBadgeClass(type: TransactionEntryType): string {
  return type === 'credit'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-300'
}

function amountColorClass(type: TransactionEntryType): string {
  return type === 'credit'
    ? 'text-green-700 dark:text-green-400'
    : 'text-red-700 dark:text-red-400'
}

function runningBalanceColorClass(amount: number): string {
  if (amount > 0) return 'text-green-700 dark:text-green-400'
  if (amount < 0) return 'text-red-700 dark:text-red-400'
  return 'text-gray-900 dark:text-gray-100'
}

function safeReturnPath(raw: string | null): string | null {
  if (!raw) return null
  let path = raw.trim()
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  path = path.trim()
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return null
  if (path === '/transactions' || path.startsWith('/transactions?')) return null
  return path
}

function TransactionsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountIdFilter = searchParams.get('accountId')?.trim() || ''
  const returnTo = safeReturnPath(searchParams.get('from'))

  const cached = getCachedTransactions()
  const [rows, setRows] = useState<TransactionRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [listPageSize, setListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterAsideRef = useRef<HTMLElement>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionEntryType | ''>('')

  const [accounts, setAccounts] = useState<AccountRecord[]>(() => getCachedAccounts() ?? [])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<
    (TransactionRecord & { runningBalance: number }) | null
  >(null)
  const [detailTab, setDetailTab] = useState<'details' | 'documents'>('details')

  const openDetail = (row: TransactionRecord & { runningBalance: number }) => {
    setDetailTab('details')
    setDetailRow(row)
  }
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => getCachedAppSettings()?.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl
  )
  const [transactionMessageTemplate, setTransactionMessageTemplate] = useState(
    () =>
      getCachedAppSettings()?.transactionMessageTemplate ??
      DEFAULT_APP_SETTINGS.transactionMessageTemplate
  )
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null)
  const [messageNotePlus, setMessageNotePlus] = useState(
    () => getCachedAppSettings()?.messageNotePlus ?? DEFAULT_APP_SETTINGS.messageNotePlus
  )
  const [messageNoteMinus, setMessageNoteMinus] = useState(
    () => getCachedAppSettings()?.messageNoteMinus ?? DEFAULT_APP_SETTINGS.messageNoteMinus
  )
  const [messageNoteZero, setMessageNoteZero] = useState(
    () => getCachedAppSettings()?.messageNoteZero ?? DEFAULT_APP_SETTINGS.messageNoteZero
  )
  const [defaultEntryMode, setDefaultEntryMode] = useState<FormMode>(
    () => getCachedAppSettings()?.defaultEntryMode ?? DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [formMode, setFormMode] = useState<FormMode>(
    () => getCachedAppSettings()?.defaultEntryMode ?? DEFAULT_APP_SETTINGS.defaultEntryMode
  )

  const formatBalance = (n: number) => formatMoney(n, currency)
  const [transactionDate, setTransactionDate] = useState(() => todayISO())
  const [accountId, setAccountId] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [narration, setNarration] = useState('')
  const [entryType, setEntryType] = useState<TransactionEntryType | ''>('')
  const [balance, setBalance] = useState('')
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

  const loadRows = useCallback(async () => {
    const hit = getCachedTransactions()
    if (hit) {
      setRows(hit)
      setReady(true)
      setListError(null)
      return
    }
    setListError(null)
    try {
      const items = await fetchTransactions()
      setRows(items)
    } catch (err) {
      setRows([])
      setListError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void loadRows()
    void loadAccounts().catch(() => {})
    return watchAppSettings((s) => {
      setDefaultEntryMode(s.defaultEntryMode)
      setCurrency(s.currency)
      setBusinessName(s.businessName)
      setLogoUrl(s.logoUrl)
      setTransactionMessageTemplate(s.transactionMessageTemplate)
      setMessageNotePlus(s.messageNotePlus)
      setMessageNoteMinus(s.messageNoteMinus)
      setMessageNoteZero(s.messageNoteZero)
    })
  }, [loadRows, loadAccounts])

  const filteredAccountName = useMemo(() => {
    if (!accountIdFilter) return null
    return (
      accounts.find((a) => a.id === accountIdFilter)?.name ??
      rows.find((r) => r.accountId === accountIdFilter)?.accountName ??
      null
    )
  }, [accountIdFilter, accounts, rows])

  const filteredRows = useMemo(() => {
    let list = rows
    if (accountIdFilter) {
      list = list.filter((row) => row.accountId === accountIdFilter)
    }
    if (dateFrom) {
      list = list.filter((row) => row.transactionDate >= dateFrom)
    }
    if (dateTo) {
      list = list.filter((row) => row.transactionDate <= dateTo)
    }
    if (typeFilter === 'credit' || typeFilter === 'debit') {
      list = list.filter((row) => row.entryType === typeFilter)
    }
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((row) => {
      const haystack = [
        String(row.entryNumber),
        row.transactionDate,
        formatDisplayDate(row.transactionDate),
        row.accountName,
        row.narration,
        row.entryType,
        String(row.balance),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, searchQuery, accountIdFilter, dateFrom, dateTo, typeFilter])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (accountIdFilter) n += 1
    if (dateFrom) n += 1
    if (dateTo) n += 1
    if (typeFilter) n += 1
    return n
  }, [accountIdFilter, dateFrom, dateTo, typeFilter])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / listPageSize) || 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, accountIdFilter, dateFrom, dateTo, typeFilter])

  useEffect(() => {
    if (!filterOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [filterOpen])

  useLayoutEffect(() => {
    const el = filterAsideRef.current
    if (el) el.inert = !filterOpen
  }, [filterOpen])

  const clearAllFilters = () => {
    setDateFrom('')
    setDateTo('')
    setTypeFilter('')
    setSearchQuery('')
    router.push(returnTo || '/transactions')
  }

  const filterByAccount = (id: string) => {
    const qs = new URLSearchParams()
    if (id) qs.set('accountId', id)
    if (returnTo) qs.set('from', returnTo)
    const q = qs.toString()
    router.push(q ? `/transactions?${q}` : '/transactions')
  }

  /** Per-account running balance: credit +, debit − (only that account’s entries). */
  const runningBalanceById = useMemo(() => {
    const byAccount = new Map<string, TransactionRecord[]>()
    for (const row of rows) {
      const list = byAccount.get(row.accountId)
      if (list) list.push(row)
      else byAccount.set(row.accountId, [row])
    }

    const map = new Map<string, number>()
    for (const list of byAccount.values()) {
      list.sort((a, b) => {
        const byDate = a.transactionDate.localeCompare(b.transactionDate)
        if (byDate !== 0) return byDate
        return a.entryNumber - b.entryNumber
      })
      let running = 0
      for (const row of list) {
        running += signedTransactionAmount(row)
        map.set(row.id, running)
      }
    }
    return map
  }, [rows])

  const pageRows = useMemo(() => {
    const start = (page - 1) * listPageSize
    return filteredRows.slice(start, start + listPageSize).map((row) => ({
      ...row,
      runningBalance: runningBalanceById.get(row.id) ?? row.balance,
    }))
  }, [filteredRows, page, listPageSize, runningBalanceById])

  const pageStartIndex = (page - 1) * listPageSize

  const paginationBar =
    totalItems > DEFAULT_TABLE_PAGE_SIZE ? (
      <div className="mt-4 flex flex-nowrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-md dark:border-gray-700 dark:bg-gray-800 lg:mt-0 lg:rounded-none lg:border-0 lg:border-t lg:border-gray-200 lg:bg-transparent lg:px-4 lg:shadow-none dark:lg:border-gray-700 lg:dark:bg-transparent">
        <select
          value={listPageSize}
          onChange={(e) => {
            setListPageSize(Number(e.target.value))
            setPage(1)
          }}
          className="h-7 shrink-0 rounded-md border border-gray-300 bg-white px-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          aria-label="Records per page"
        >
          {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1">
          <span className="mr-1 shrink-0 text-xs tabular-nums text-gray-600 dark:text-gray-400">
            {pageStartIndex + 1}–{Math.min(pageStartIndex + listPageSize, totalItems)} of {totalItems}
          </span>
          <TablePaginationNav page={page} totalPages={totalPages} onPageChange={setPage} size="sm" />
        </div>
      </div>
    ) : null

  const openAdd = () => {
    setFormError(null)
    setEditingId(null)
    setFormMode(defaultEntryMode)
    setTransactionDate(todayISO())
    setAccountId('')
    setFromAccountId('')
    setToAccountId('')
    setNarration('')
    setEntryType('')
    setBalance('')
    setModalOpen(true)
    void loadAccounts().catch(() => {})
    const cachedSettings = getCachedAppSettings()
    if (cachedSettings) setDefaultEntryMode(cachedSettings.defaultEntryMode)
  }

  const openEdit = (row: TransactionRecord) => {
    setFormError(null)
    setEditingId(row.id)
    setFormMode('normal')
    setTransactionDate(row.transactionDate)
    setAccountId(row.accountId)
    setFromAccountId('')
    setToAccountId('')
    setNarration(row.narration)
    setEntryType(row.entryType)
    setBalance(String(row.balance))
    setModalOpen(true)
    void loadAccounts().catch(() => {})
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingId(null)
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

    const isTransfer = !editingId && formMode === 'transfer'

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
    setLoading(true)
    try {
      if (editingId) {
        const item = await updateTransaction(editingId, {
          transactionDate,
          accountId,
          narration: narrationTrim,
          entryType: entryType as TransactionEntryType,
          balance: amount,
        })
        setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)))
      } else if (isTransfer) {
        // Two independent entries: debit from Out, credit to In (not linked).
        const debitItem = await createTransaction({
          transactionDate,
          accountId: fromAccountId,
          narration: narrationTrim,
          entryType: 'debit',
          balance: amount,
        })
        const creditItem = await createTransaction({
          transactionDate,
          accountId: toAccountId,
          narration: narrationTrim,
          entryType: 'credit',
          balance: amount,
        })
        setRows((prev) => [creditItem, debitItem, ...prev])
        setPage(1)
      } else {
        const item = await createTransaction({
          transactionDate,
          accountId,
          narration: narrationTrim,
          entryType: entryType as TransactionEntryType,
          balance: amount,
        })
        setRows((prev) => [item, ...prev])
        setPage(1)
      }
      setModalOpen(false)
      setEditingId(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    setListError(null)
    try {
      await deleteTransaction(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirmId(null)
    } finally {
      setLoading(false)
    }
  }

  const sendTransactionMessage = (row: TransactionRecord) => {
    const template = transactionMessageTemplate.trim()
    if (!template) {
      setListError('Set a Transaction message template in Settings first.')
      return
    }
    const account = accounts.find((a) => a.id === row.accountId)
    const currentBalance = runningBalanceById.get(row.id) ?? signedTransactionAmount(row)
    const previousBalance = currentBalance - signedTransactionAmount(row)
    const text = fillMessageTemplate(
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
      })
    )
    openWhatsAppMessage(account?.phone, text)
  }

  const exportTransactionAsPdf = async (row: TransactionRecord) => {
    setExportingPdfId(row.id)
    setListError(null)
    try {
      const account = accounts.find((a) => a.id === row.accountId) ?? null
      await exportTransactionPdf(row, {
        currency,
        businessName,
        logoUrl,
        account,
        runningBalance: runningBalanceById.get(row.id),
      })
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Transaction PDF export failed.')
    } finally {
      setExportingPdfId(null)
    }
  }

  const actionsFor = (row: TransactionRecord) => (
    <ActionsDropdown
      ariaLabel={`Actions for entry ${row.entryNumber}`}
      items={[
        { key: 'edit', label: 'Edit', onClick: () => openEdit(row) },
        {
          key: 'pdf',
          label: exportingPdfId === row.id ? 'Exporting PDF…' : 'Export PDF',
          disabled: exportingPdfId === row.id,
          onClick: () => void exportTransactionAsPdf(row),
        },
        {
          key: 'send',
          label: 'Send message',
          onClick: () => sendTransactionMessage(row),
        },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: () => setDeleteConfirmId(row.id),
        },
      ]}
    />
  )

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 space-y-3 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {returnTo ? (
              <button
                type="button"
                onClick={() => router.push(returnTo)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
            <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
              Transactions
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
                aria-label="About Transactions"
                aria-expanded={infoOpen}
                aria-controls="transactions-info-popover"
              >
                <Info className="h-5 w-5" aria-hidden />
              </button>
              {infoOpen ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden />
                  <div
                    id="transactions-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Add and manage ledger transactions against your accounts.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <div className="relative hidden h-10 w-56 lg:block lg:w-64">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions…"
                aria-label="Search transactions"
                className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm leading-none text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                activeFilterCount > 0
                  ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              aria-label="Open filters"
              aria-expanded={filterOpen}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold leading-none text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
              aria-label="Add Transaction"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="hidden h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium leading-none text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:inline-flex"
            >
              Add
            </button>
          </div>
        </div>
        <div className="relative lg:hidden">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transactions…"
            aria-label="Search transactions"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

      {activeFilterCount > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-100">
          <span className="min-w-0 flex-1">
            {accountIdFilter ? (
              <>
                Account:{' '}
                <span className="font-semibold">{filteredAccountName ?? 'selected'}</span>
                {(dateFrom || dateTo || typeFilter) && ' · '}
              </>
            ) : null}
            {dateFrom || dateTo
              ? `Date: ${dateFrom ? formatDisplayDate(dateFrom) : '…'} – ${dateTo ? formatDisplayDate(dateTo) : '…'}`
              : null}
            {(dateFrom || dateTo) && typeFilter ? ' · ' : null}
            {typeFilter ? (
              <>
                Type: <span className="font-semibold capitalize">{typeFilter}</span>
              </>
            ) : null}
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-xs font-medium text-primary-800 hover:bg-white dark:bg-gray-800 dark:text-primary-200 dark:hover:bg-gray-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        </div>
      ) : null}

      {/* Right filter drawer */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
          filterOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setFilterOpen(false)}
        aria-hidden={!filterOpen}
      />
      <aside
        ref={filterAsideRef}
        className={`fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] transform flex-col bg-white shadow-xl transition-transform duration-200 ease-out dark:bg-gray-800 ${
          filterOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Transaction filters"
        aria-hidden={!filterOpen}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h2>
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Close filters"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <label
              htmlFor="filter-date-from"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Date from
            </label>
            <input
              id="filter-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="filter-date-to"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Date to
            </label>
            <input
              id="filter-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="filter-account"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Account
            </label>
            <SearchableSelect
              key={`filter-acc-${accountIdFilter || 'all'}`}
              id="filter-account"
              value={accountIdFilter}
              onChange={filterByAccount}
              options={accountOptions}
              placeholder="All accounts…"
              emptyMessage="No accounts"
              className={inputClass}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </span>
            <div className="flex flex-col gap-2">
              {(
                [
                  { id: '' as const, label: 'All' },
                  { id: 'credit' as const, label: 'Credit' },
                  { id: 'debit' as const, label: 'Debit' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id || 'all'}
                  type="button"
                  onClick={() => setTypeFilter(option.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    typeFilter === option.id
                      ? option.id === 'credit'
                        ? 'border-green-600 bg-green-50 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : option.id === 'debit'
                          ? 'border-red-600 bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          : 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setFilterOpen(false)}
            className="flex-1 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Done
          </button>
        </div>
      </aside>

      {/* Mobile cards */}
      <div className={`space-y-3 lg:hidden ${loading ? 'opacity-70' : ''}`}>
        {!ready ? (
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 h-5 w-36 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-700/50" />
                <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700/50" />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No transactions yet. Tap + to add one.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No transactions match your search.
          </div>
        ) : (
          pageRows.map((row) => (
            <article
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => openDetail(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openDetail(row)
                }
              }}
              className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    SR. {row.entryNumber} - {formatDisplayDate(row.transactionDate)}
                  </p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                      {row.accountName}
                    </h2>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${entryTypeBadgeClass(row.entryType)}`}
                    >
                      {row.entryType}
                    </span>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>{actionsFor(row)}</div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Narration
                </p>
                <p className="mt-0.5 truncate text-sm text-gray-700 dark:text-gray-200">
                  {row.narration.trim() ? row.narration : '—'}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Balance
                  </dt>
                  <dd className={`mt-0.5 tabular-nums font-medium ${amountColorClass(row.entryType)}`}>
                    {row.entryType === 'debit' ? '− ' : '+ '}
                    {formatBalance(Math.abs(row.balance))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Running Balance
                  </dt>
                  <dd
                    className={`mt-0.5 tabular-nums font-medium ${runningBalanceColorClass(row.runningBalance)}`}
                  >
                    {formatBalance(row.runningBalance)}
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
        <div className="lg:hidden">{paginationBar}</div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  SR.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Transaction Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Account Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Narration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Running Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-100 dark:divide-gray-700 ${loading ? 'opacity-70' : ''}`}
            >
              {!ready ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No transactions yet. Click Add to create one.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No transactions match your search.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetail(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openDetail(row)
                      }
                    }}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                      {row.entryNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {formatDisplayDate(row.transactionDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          filterByAccount(row.accountId)
                        }}
                        className="inline-flex min-h-6 items-center text-left text-primary-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
                      >
                        {row.accountName}
                      </button>
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.narration || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${entryTypeBadgeClass(row.entryType)}`}
                      >
                        {row.entryType}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-medium ${amountColorClass(row.entryType)}`}
                    >
                      {row.entryType === 'debit' ? '− ' : '+ '}
                      {formatBalance(Math.abs(row.balance))}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-medium ${runningBalanceColorClass(row.runningBalance)}`}
                    >
                      {formatBalance(row.runningBalance)}
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actionsFor(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paginationBar}
      </div>

      {modalOpen && (
        <div
          className={formModalOverlayClass}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-modal-title"
        >
          <div className={`${formModalPanelClass} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="transaction-modal-title"
              title={editingId ? 'Edit Transaction' : 'Add Transaction'}
              onClose={closeModal}
            />
            <FormModalBody>
              {formError ? (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {formError}
                </div>
              ) : null}
              <form
                id="transaction-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="space-y-4"
              >
                {!editingId ? (
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
                ) : null}

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

                {formMode === 'transfer' && !editingId ? (
                  <>
                    <div>
                      <label
                        htmlFor="txn-to-account"
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        To Account (In) <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        key="to-account"
                        id="txn-to-account"
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
                        htmlFor="txn-from-account"
                        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        From Account (Out) <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        key="from-account"
                        id="txn-from-account"
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
                      htmlFor="txn-account"
                      className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      key={editingId ?? 'add-account'}
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
                )}

                {accounts.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No accounts yet. Add them under Accounts first.
                  </p>
                ) : null}

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

                {formMode === 'normal' || editingId ? (
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
              </form>
            </FormModalBody>
            <FormModalFooter>
              <button
                type="submit"
                form="transaction-form"
                disabled={submitting}
                className={formModalPrimaryButtonClass}
              >
                {submitting ? 'Saving…' : editingId ? 'Save' : 'Add'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className={formModalSecondaryButtonClass}
              >
                Cancel
              </button>
            </FormModalFooter>
          </div>
        </div>
      )}

      {detailRow && (
        <div
          className={formModalOverlayClass}
          onClick={() => setDetailRow(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-detail-title"
        >
          <div className={`${formModalPanelClass} max-w-lg`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="transaction-detail-title"
              title={
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{detailRow.accountName}</span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${entryTypeBadgeClass(detailRow.entryType)}`}
                  >
                    {detailRow.entryType}
                  </span>
                </span>
              }
              onClose={() => setDetailRow(null)}
            />
            <FormModalBody>
              <div
                className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900/60"
                role="tablist"
                aria-label="Transaction sections"
              >
                {(
                  [
                    { id: 'details' as const, label: 'Details' },
                    { id: 'documents' as const, label: 'Documents' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === tab.id}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      detailTab === tab.id
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                    onClick={() => setDetailTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {detailTab === 'details' ? (
                <dl className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Transaction Date
                      </dt>
                      <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                        {formatDisplayDate(detailRow.transactionDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        SR.
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-gray-900 dark:text-gray-100">
                        {detailRow.entryNumber}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Narration
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
                      {detailRow.narration.trim() ? detailRow.narration : '—'}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 items-start gap-3">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Balance
                      </dt>
                      <dd
                        className={`mt-0.5 tabular-nums font-medium ${amountColorClass(detailRow.entryType)}`}
                      >
                        {detailRow.entryType === 'debit' ? '− ' : '+ '}
                        {formatBalance(Math.abs(detailRow.balance))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Running Balance
                      </dt>
                      <dd
                        className={`mt-0.5 tabular-nums font-medium ${runningBalanceColorClass(detailRow.runningBalance)}`}
                      >
                        {formatBalance(detailRow.runningBalance)}
                      </dd>
                    </div>
                  </div>
                </dl>
              ) : (
                <TransactionDocumentsPanel transactionId={detailRow.id} />
              )}
            </FormModalBody>
            <FormModalFooter className="justify-center sm:justify-end">
              {detailTab === 'details' ? (
                <button
                  type="button"
                  onClick={() => {
                    const row = detailRow
                    setDetailRow(null)
                    openEdit(row)
                  }}
                  className={`${formModalPrimaryButtonClass} flex-none`}
                >
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className={`${formModalSecondaryButtonClass} flex-none`}
              >
                Close
              </button>
            </FormModalFooter>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div
          className={formModalOverlayClass}
          onClick={() => setDeleteConfirmId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-transaction-title"
        >
          <div className={`${formModalPanelClass} max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="delete-transaction-title"
              title="Delete Transaction?"
              onClose={() => setDeleteConfirmId(null)}
            />
            <FormModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This permanently removes the transaction. You can add it again later if needed.
              </p>
            </FormModalBody>
            <FormModalFooter>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirmId)}
                disabled={loading}
                className={formModalDangerButtonClass}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className={formModalSecondaryButtonClass}
              >
                Cancel
              </button>
            </FormModalFooter>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-gray-500 lg:p-8 dark:text-gray-400">Loading…</div>
      }
    >
      <TransactionsPageInner />
    </Suspense>
  )
}

'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Info,
  Loader2,
  Plus,
} from 'lucide-react'
import AccountMobileCard from '@/components/AccountMobileCard'
import ActionsDropdown from '@/components/ActionsDropdown'
import SoftSearchField from '@/components/SoftSearchField'
import { WhatsAppPrepOverlay } from '@/components/WhatsAppPrepOverlay'
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
import { TablePaginationNav } from '@/components/TablePaginationNav'
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
  exportAccountLedger,
  type LedgerExportFormat,
} from '@/lib/ledgerExport'
import {
  accountMessageVars,
  fillMessageTemplate,
  openWhatsAppMessage,
} from '@/lib/messageTemplates'
import {
  accountDayMovement,
  todayNetsByAccount,
} from '@/lib/accountDayMovement'
import { formatMoney } from '@/lib/money'
import {
  buildShareAccessFooter,
  createLedgerShare,
  formatShareExpiryLabel,
} from '@/lib/ledgerShare'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from '@/lib/tablePagination'
import {
  fetchTransactions,
  getCachedTransactions,
  type TransactionRecord,
} from '@/lib/transactions'

function AccountsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cached = getCachedAccounts()
  const [rows, setRows] = useState<AccountRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [listPageSize, setListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [waPrepPercent, setWaPrepPercent] = useState(0)
  const [waPrepLabel, setWaPrepLabel] = useState('Preparing message…')
  const [infoOpen, setInfoOpen] = useState(false)
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )
  const [businessName, setBusinessName] = useState(
    () => getCachedAppSettings()?.businessName ?? DEFAULT_APP_SETTINGS.businessName
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
    () => getCachedAppSettings()?.messageNoteMinus ?? DEFAULT_APP_SETTINGS.messageNoteMinus
  )
  const [messageNoteZero, setMessageNoteZero] = useState(
    () => getCachedAppSettings()?.messageNoteZero ?? DEFAULT_APP_SETTINGS.messageNoteZero
  )
  const [accountMessageIncludeLedgerUrl, setAccountMessageIncludeLedgerUrl] = useState(
    () =>
      getCachedAppSettings()?.accountMessageIncludeLedgerUrl ??
      DEFAULT_APP_SETTINGS.accountMessageIncludeLedgerUrl
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(
    () => getCachedAppSettings()?.logoUrl ?? DEFAULT_APP_SETTINGS.logoUrl
  )
  const [exportAccount, setExportAccount] = useState<AccountRecord | null>(null)
  const [exportFormat, setExportFormat] = useState<LedgerExportFormat>('pdf')
  const [exporting, setExporting] = useState(false)
  const [transactions, setTransactions] = useState<TransactionRecord[]>(
    () => getCachedTransactions() ?? []
  )

  const loadRows = useCallback(async () => {
    setListError(null)
    try {
      const items = await fetchAccounts({ force: true })
      setRows(items)
    } catch (err) {
      setRows([])
      setListError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void loadRows()
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
  }, [loadRows])

  useEffect(() => {
    const hit = getCachedTransactions()
    if (hit) setTransactions(hit)
    let cancelled = false
    void fetchTransactions()
      .then((items) => {
        if (!cancelled) setTransactions(items)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const dayNetsByAccount = useMemo(
    () => todayNetsByAccount(transactions),
    [transactions]
  )

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.phone,
        row.accountTypeName,
        row.cashTypeName,
        String(row.balance),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, searchQuery])

  const totalItems = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalItems / listPageSize) || 1)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const pageRows = useMemo(() => {
    const start = (page - 1) * listPageSize
    return filteredRows.slice(start, start + listPageSize)
  }, [filteredRows, page, listPageSize])

  const pageStartIndex = (page - 1) * listPageSize

  const paginationBar =
    totalItems > DEFAULT_TABLE_PAGE_SIZE ? (
      <div className="mt-4 flex flex-nowrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-md dark:border-gray-700 dark:bg-gray-800 lg:mt-0 lg:rounded-none lg:border-0 lg:border-t lg:border-gray-200 lg:bg-transparent lg:px-4 lg:shadow-none dark:lg:border-gray-700 lg:dark:bg-transparent">
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
    router.push('/accounts/new')
  }

  const openDetail = (row: AccountRecord) => {
    router.push(`/accounts/${encodeURIComponent(row.id)}`)
  }

  const openEdit = (row: AccountRecord) => {
    router.push(
      `/accounts/${encodeURIComponent(row.id)}/edit?from=${encodeURIComponent('/accounts')}`
    )
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    setListError(null)
    try {
      await deleteAccount(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirmId(null)
    } finally {
      setLoading(false)
    }
  }

  const formatBalance = (balance: number) => formatMoney(balance, currency)

  const balanceColorClass = (balance: number) => {
    if (balance > 0) return 'text-green-700 dark:text-green-400'
    if (balance < 0) return 'text-red-700 dark:text-red-400'
    return 'text-gray-800 dark:text-gray-200'
  }

  // Legacy /accounts?edit={id} → edit page.
  useEffect(() => {
    const editId = searchParams.get('edit')?.trim()
    if (!editId) return
    router.replace(
      `/accounts/${encodeURIComponent(editId)}/edit?from=${encodeURIComponent('/accounts')}`
    )
  }, [searchParams, router])

  const sendAccountMessage = async (row: AccountRecord) => {
    const template = accountMessageTemplate.trim()
    if (!template) {
      setListError('Set an Account message template in Settings first.')
      return
    }
    if (sendingMessage) return
    setSendingMessage(true)
    setListError(null)
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
          setListError(
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

        // Ensure PIN / expiry appear even with older templates that only had URL.
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

      bump(96, 'Opening WhatsApp…')
      openWhatsAppMessage(row.phone, text)
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : 'Could not open WhatsApp message.'
      )
    } finally {
      setSendingMessage(false)
      setWaPrepPercent(0)
    }
  }

  const openExportModal = (row: AccountRecord) => {
    setExportFormat('pdf')
    setExportAccount(row)
    setListError(null)
  }

  const handleExportLedger = async () => {
    if (!exportAccount) return
    setExporting(true)
    setListError(null)
    try {
      await exportAccountLedger(exportAccount, exportFormat, {
        currency,
        businessName,
        logoUrl,
      })
      setExportAccount(null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Ledger export failed.')
    } finally {
      setExporting(false)
    }
  }

  const actionsFor = (
    row: AccountRecord,
    opts?: {
      buttonClassName?: string
      iconClassName?: string
      variant?: 'menu' | 'inline'
    }
  ) => (
    <ActionsDropdown
      ariaLabel={`Actions for ${row.name}`}
      buttonClassName={opts?.buttonClassName}
      iconClassName={opts?.iconClassName}
      variant={opts?.variant}
      items={[
        {
          key: 'details',
          label: 'Details',
          onClick: () => openDetail(row),
        },
        {
          key: 'edit',
          label: 'Edit',
          onClick: () => openEdit(row),
        },
        {
          key: 'export',
          label: 'Export ledger',
          onClick: () => openExportModal(row),
        },
        {
          key: 'send',
          label: 'Send message',
          onClick: () => {
            void sendAccountMessage(row)
          },
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

  const mobileCardActions = (row: AccountRecord) =>
    actionsFor(row, {
      variant: 'inline',
      buttonClassName:
        'inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/55 p-1.5 text-brand-ink shadow-sm transition-colors hover:bg-white/90 focus:outline-none',
      iconClassName: 'h-5 w-5 text-brand-ink',
    })

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 space-y-3 lg:mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
              Accounts
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
                aria-label="About Accounts"
                aria-expanded={infoOpen}
                aria-controls="accounts-info-popover"
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
                    id="accounts-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Add and manage your ledger accounts here.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex h-10 shrink-0 items-center gap-2">
            <SoftSearchField
              className="hidden w-56 lg:flex lg:w-72"
              size="sm"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search accounts…"
              aria-label="Search accounts"
            />
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
              aria-label="Add Account"
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
        <SoftSearchField
          className="lg:hidden"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search accounts…"
          aria-label="Search accounts"
        />
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

      {/* Mobile cards — curved fintech-style (same language as Transactions) */}
      <div className={`space-y-3.5 lg:hidden ${loading ? 'opacity-70' : ''}`}>
        {!ready ? (
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-[1.75rem] bg-brand-sky/80 p-4"
            >
              <div className="mb-3 h-4 w-20 rounded bg-white/40" />
              <div className="mb-2 h-5 w-2/3 rounded bg-brand-ink/20" />
              <div className="mb-3 h-3 w-1/2 rounded bg-brand-ink/15" />
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-white/50" />
                <div className="h-6 w-28 rounded-full bg-white/30" />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No accounts yet. Tap + to add one.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[1.75rem] border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No accounts match your search.
          </div>
        ) : (
          pageRows.map((row, index) => {
            const movement = accountDayMovement(
              Number(row.balance) || 0,
              dayNetsByAccount.get(row.id) ?? 0
            )
            return (
              <AccountMobileCard
                key={row.id}
                row={{
                  id: row.id,
                  serialNumber: pageStartIndex + index + 1,
                  name: row.name,
                  phone: row.phone,
                  accountTypeName: row.accountTypeName,
                  cashTypeName: row.cashTypeName,
                  balance: row.balance,
                  dayDelta: movement.dayDelta,
                  dayDeltaPct: movement.dayDeltaPct,
                }}
                formatBalance={formatBalance}
                currency={currency}
                actions={mobileCardActions(row)}
                onOpen={() => openDetail(row)}
              />
            )
          })
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
                  ACC Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Phone Number
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ACC Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cash Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${loading ? 'opacity-70' : ''}`}>
              {!ready ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No accounts yet. Click Add to create one.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No accounts match your search.
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
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
                      {pageStartIndex + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-700 dark:text-primary-300">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.phone || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.accountTypeName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.cashTypeName}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-medium ${balanceColorClass(row.balance)}`}
                    >
                      {formatBalance(row.balance)}
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

      {exportAccount ? (
        <div
          className={formModalOverlayClass}
          onClick={() => {
            if (!exporting) setExportAccount(null)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-ledger-title"
        >
          <div
            className={`${formModalPanelClass} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <FormModalHeader
              titleId="export-ledger-title"
              title="Export ledger"
              onClose={() => {
                if (!exporting) setExportAccount(null)
              }}
            />
            <FormModalBody>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                Download the full ledger for{' '}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {exportAccount.name}
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
                      name="ledger-export-format"
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
                onClick={() => setExportAccount(null)}
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

      {deleteConfirmId && (
        <div
          className={formModalOverlayClass}
          onClick={() => setDeleteConfirmId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className={`${formModalPanelClass} max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="delete-account-title"
              title="Delete Account?"
              onClose={() => setDeleteConfirmId(null)}
            />
            <FormModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This permanently removes the account. You can add it again later if needed.
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
      <WhatsAppPrepOverlay
        open={sendingMessage}
        percent={waPrepPercent}
        label={waPrepLabel}
      />
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-4 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" aria-hidden />
        </div>
      }
    >
      <AccountsPageInner />
    </Suspense>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Info, Phone, Plus, Search } from 'lucide-react'
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
import { TablePaginationNav } from '@/components/TablePaginationNav'
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  getCachedAccounts,
  updateAccount,
  type AccountRecord,
} from '@/lib/accounts'
import {
  DEFAULT_APP_SETTINGS,
  getCachedAppSettings,
  watchAppSettings,
} from '@/lib/appSettings'
import { formatMoney } from '@/lib/money'
import {
  fetchSetupTypes,
  getCachedSetupTypes,
  type SetupTypeRecord,
} from '@/lib/setupTypes'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from '@/lib/tablePagination'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

export default function AccountsPage() {
  const cached = getCachedAccounts()
  const [rows, setRows] = useState<AccountRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [listPageSize, setListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [searchQuery, setSearchQuery] = useState('')

  const [accountTypes, setAccountTypes] = useState<SetupTypeRecord[]>(
    () => getCachedSetupTypes('account-types') ?? []
  )
  const [cashTypes, setCashTypes] = useState<SetupTypeRecord[]>(
    () => getCachedSetupTypes('cash-types') ?? []
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [accountTypeId, setAccountTypeId] = useState('')
  const [cashTypeId, setCashTypeId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [currency, setCurrency] = useState(
    () => getCachedAppSettings()?.currency ?? DEFAULT_APP_SETTINGS.currency
  )

  const loadLookups = useCallback(async () => {
    const [ats, cts] = await Promise.all([
      fetchSetupTypes('account-types'),
      fetchSetupTypes('cash-types'),
    ])
    setAccountTypes(ats.filter((t) => t.active))
    setCashTypes(cts.filter((t) => t.active))
  }, [])

  const loadRows = useCallback(async () => {
    setListError(null)
    try {
      const items = await fetchAccounts()
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
    void loadLookups().catch(() => {})
    return watchAppSettings((s) => setCurrency(s.currency))
  }, [loadRows, loadLookups])

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
    setName('')
    setPhone('')
    setAccountTypeId(accountTypes[0]?.id ?? '')
    setCashTypeId(cashTypes[0]?.id ?? '')
    setModalOpen(true)
    void loadLookups().catch(() => {})
  }

  const openEdit = (row: AccountRecord) => {
    setFormError(null)
    setEditingId(row.id)
    setName(row.name)
    setPhone(row.phone)
    setAccountTypeId(row.accountTypeId)
    setCashTypeId(row.cashTypeId)
    setModalOpen(true)
    void loadLookups().catch(() => {})
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Account name is required.')
      return
    }
    if (!accountTypeId) {
      setFormError('Account type is required.')
      return
    }
    if (!cashTypeId) {
      setFormError('Cash type is required.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    setLoading(true)
    const payload = {
      name: trimmedName,
      phone: phone.trim(),
      accountTypeId,
      cashTypeId,
    }
    try {
      if (editingId) {
        const item = await updateAccount(editingId, payload)
        setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)))
      } else {
        const item = await createAccount(payload)
        setRows((prev) => [...prev, item])
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

  const actionsFor = (row: AccountRecord) => (
    <ActionsDropdown
      ariaLabel={`Actions for ${row.name}`}
      items={[
        {
          key: 'edit',
          label: 'Edit',
          onClick: () => openEdit(row),
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
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative hidden w-56 lg:block lg:w-64">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts…"
                aria-label="Search accounts"
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="rounded-md bg-primary-600 p-2.5 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
              aria-label="Add Account"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="hidden rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 lg:inline-flex"
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
            placeholder="Search accounts…"
            aria-label="Search accounts"
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

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
            No accounts yet. Tap + to add one.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No accounts match your search.
          </div>
        ) : (
          pageRows.map((row) => {
            const phoneDigits = row.phone.replace(/[^\d+]/g, '')
            return (
              <article
                key={row.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/transactions?accountId=${encodeURIComponent(row.id)}&from=${encodeURIComponent('/accounts')}`}
                      className="block truncate text-base font-semibold text-primary-700 hover:underline dark:text-primary-300"
                    >
                      {row.name}
                    </Link>
                    {row.phone ? (
                      <a
                        href={`tel:${phoneDigits}`}
                        className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline dark:text-primary-400"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {row.phone}
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">—</p>
                    )}
                  </div>
                  {actionsFor(row)}
                </div>
                <div className="flex items-end justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </p>
                    <p className="mt-0.5 truncate text-gray-800 dark:text-gray-200">
                      {row.accountTypeName}
                      {row.accountTypeName && row.cashTypeName ? ' · ' : ''}
                      {row.cashTypeName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Balance
                    </p>
                    <p className={`mt-0.5 tabular-nums font-medium ${balanceColorClass(row.balance)}`}>
                      {formatBalance(row.balance)}
                    </p>
                  </div>
                </div>
              </article>
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
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-700 ${loading ? 'opacity-70' : ''}`}>
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
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-500 dark:text-gray-400">
                      {pageStartIndex + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                      <Link
                        href={`/transactions?accountId=${encodeURIComponent(row.id)}&from=${encodeURIComponent('/accounts')}`}
                        className="text-primary-700 hover:underline dark:text-primary-300"
                      >
                        {row.name}
                      </Link>
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
                    <td className="whitespace-nowrap px-4 py-3 text-right">{actionsFor(row)}</td>
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
          aria-labelledby="account-modal-title"
        >
          <div className={`${formModalPanelClass} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="account-modal-title"
              title={editingId ? 'Edit Account' : 'Add Account'}
              onClose={closeModal}
            />
            <FormModalBody>
              {formError ? (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {formError}
                </div>
              ) : null}
              <form id="account-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label
                    htmlFor="acc-name"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    ACC Name
                  </label>
                  <input
                    id="acc-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Cash Counter, Customer ABC"
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    htmlFor="acc-phone"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Phone Number
                  </label>
                  <input
                    id="acc-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. 0300 1234567"
                  />
                </div>
                <div>
                  <label
                    htmlFor="acc-type"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    ACC Type
                  </label>
                  <select
                    id="acc-type"
                    value={accountTypeId}
                    onChange={(e) => setAccountTypeId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select account type…</option>
                    {accountTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                  {accountTypes.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      No active account types. Add them under Settings → Account Type.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor="cash-type"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Cash Type
                  </label>
                  <select
                    id="cash-type"
                    value={cashTypeId}
                    onChange={(e) => setCashTypeId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select cash type…</option>
                    {cashTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                  {cashTypes.length === 0 ? (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      No active cash types. Add them under Settings → Cash Type.
                    </p>
                  ) : null}
                </div>
              </form>
            </FormModalBody>
            <FormModalFooter>
              <button
                type="submit"
                form="account-form"
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
                This removes the account from Supabase. You can add it again later if needed.
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

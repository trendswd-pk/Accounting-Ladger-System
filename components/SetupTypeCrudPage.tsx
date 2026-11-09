'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalDangerButtonClass,
  formModalOverlayClass,
  formModalPanelClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import SetupTypeMobileCard from '@/components/SetupTypeMobileCard'
import {
  fetchAccounts,
  getCachedAccounts,
  type AccountRecord,
} from '@/lib/accounts'
import {
  deleteSetupType,
  fetchSetupTypes,
  getCachedSetupTypes,
  type SetupTypeKind,
  type SetupTypeRecord,
} from '@/lib/setupTypes'

type SetupTypeCrudPageProps = {
  title: string
  kind: SetupTypeKind
  singularLabel: string
  emptyHint: string
  listPath: string
}

export default function SetupTypeCrudPage({
  title,
  kind,
  singularLabel,
  emptyHint,
  listPath,
}: SetupTypeCrudPageProps) {
  const router = useRouter()
  const cached = getCachedSetupTypes(kind)
  const [rows, setRows] = useState<SetupTypeRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [accounts, setAccounts] = useState<AccountRecord[]>(
    () => getCachedAccounts() ?? []
  )

  const loadAccounts = useCallback(async () => {
    try {
      const items = await fetchAccounts()
      setAccounts(items)
    } catch {
      // keep cached / empty
    }
  }, [])

  const loadRows = useCallback(async () => {
    const hit = getCachedSetupTypes(kind)
    if (hit) {
      setRows(hit)
      setReady(true)
      setListError(null)
      return
    }

    setListError(null)
    try {
      const items = await fetchSetupTypes(kind)
      setRows(items)
    } catch (err) {
      setRows([])
      setListError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [kind])

  useEffect(() => {
    void loadRows()
    void loadAccounts()
  }, [loadRows, loadAccounts])

  const linkedCountByTypeId = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of accounts) {
      const id = kind === 'account-types' ? a.accountTypeId : a.cashTypeId
      if (!id) continue
      map.set(id, (map.get(id) ?? 0) + 1)
    }
    return map
  }, [accounts, kind])

  const openType = (row: SetupTypeRecord) => {
    router.push(`${listPath}/${row.id}`)
  }

  const openAdd = () => {
    router.push(`${listPath}/new?from=${encodeURIComponent(listPath)}`)
  }

  const openEdit = (row: SetupTypeRecord) => {
    router.push(
      `${listPath}/${encodeURIComponent(row.id)}/edit?from=${encodeURIComponent(listPath)}`
    )
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    setListError(null)
    try {
      await deleteSetupType(kind, id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirmId(null)
    } finally {
      setLoading(false)
    }
  }

  const actionsFor = (row: SetupTypeRecord) => (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => openEdit(row)}
        disabled={loading}
        className="rounded-full p-2 text-brand-ink/80 hover:bg-white/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
        title="Edit"
        aria-label={`Edit ${row.name}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setDeleteConfirmId(row.id)}
        disabled={loading}
        className="rounded-full p-2 text-red-700 hover:bg-white/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
        title="Delete"
        aria-label={`Delete ${row.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  const formatLinkedCount = (count: number) =>
    `${count} account${count === 1 ? '' : 's'}`

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
            {title}
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
              aria-label={`About ${title}`}
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
                  className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  Manage {title.toLowerCase()} used across the ledger. Tap a
                  type to see linked accounts.
                </div>
              </>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-md bg-primary-600 p-2.5 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 lg:hidden"
          aria-label={`Add ${singularLabel}`}
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={openAdd}
          className="hidden rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 lg:inline-flex"
        >
          Add {singularLabel}
        </button>
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

      {/* Mobile — brand-sky cards */}
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
            {emptyHint}
          </div>
        ) : (
          rows.map((row) => {
            const count = linkedCountByTypeId.get(row.id) ?? 0
            return (
              <SetupTypeMobileCard
                key={row.id}
                name={row.name}
                code={row.code}
                description={row.description}
                active={row.active}
                metaRight={formatLinkedCount(count)}
                actions={actionsFor(row)}
                onOpen={() => openType(row)}
              />
            )
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Accounts
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-gray-200 dark:divide-gray-700 ${loading ? 'opacity-70' : ''}`}
            >
              {!ready ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const count = linkedCountByTypeId.get(row.id) ?? 0
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => openType(row)}
                          className="text-left text-primary-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm uppercase text-primary-600 dark:text-primary-400">
                        {row.code}
                      </td>
                      <td className="max-w-md truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {row.description || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-200">
                        <button
                          type="button"
                          onClick={() => openType(row)}
                          className="text-primary-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
                        >
                          {formatLinkedCount(count)}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.active
                              ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/35 dark:text-primary-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {row.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            disabled={loading}
                            className="rounded-md p-2 text-primary-600 hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:hover:bg-gray-700"
                            title="Edit"
                            aria-label={`Edit ${row.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(row.id)}
                            disabled={loading}
                            className="rounded-md p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
                            title="Delete"
                            aria-label={`Delete ${row.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirmId ? (
        <div
          className={formModalOverlayClass}
          onClick={() => setDeleteConfirmId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div
            className={`${formModalPanelClass} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <FormModalHeader
              titleId="delete-confirm-title"
              title={`Delete ${singularLabel}?`}
              onClose={() => setDeleteConfirmId(null)}
            />
            <FormModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This permanently removes the type. You can add it again later if
                needed.
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
      ) : null}
    </div>
  )
}

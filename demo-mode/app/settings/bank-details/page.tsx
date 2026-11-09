'use client'

import { useCallback, useEffect, useState } from 'react'
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
import {
  deleteBank,
  fetchBanks,
  getCachedBanks,
  type BankDetailRecord,
} from '@/lib/banks'

export default function BankDetailsPage() {
  const router = useRouter()
  const cached = getCachedBanks()
  const [rows, setRows] = useState<BankDetailRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  const loadRows = useCallback(async () => {
    const hit = getCachedBanks()
    if (hit) {
      setRows(hit)
      setReady(true)
      setListError(null)
      return
    }
    setListError(null)
    try {
      const items = await fetchBanks()
      setRows(items)
    } catch (err) {
      setRows([])
      setListError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const openAdd = () => {
    router.push('/settings/bank-details/new?from=%2Fsettings%2Fbank-details')
  }

  const openEdit = (row: BankDetailRecord) => {
    router.push(
      `/settings/bank-details/${encodeURIComponent(row.id)}/edit?from=${encodeURIComponent('/settings/bank-details')}`
    )
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    setListError(null)
    try {
      await deleteBank(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
      setDeleteConfirmId(null)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Delete failed')
      setDeleteConfirmId(null)
    } finally {
      setLoading(false)
    }
  }

  const actionsFor = (row: BankDetailRecord) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => openEdit(row)}
        disabled={loading}
        className="rounded-md p-2 text-primary-600 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:hover:bg-gray-700"
        title="Edit"
        aria-label={`Edit ${row.bankName}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setDeleteConfirmId(row.id)}
        disabled={loading}
        className="rounded-md p-2 text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 dark:hover:bg-red-950/30"
        title="Delete"
        aria-label={`Delete ${row.bankName}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
            Bank Details
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
              aria-label="About Bank Details"
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
                  Save your business bank accounts for receipts, vouchers, and
                  sharing.
                </div>
              </>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="shrink-0 rounded-md bg-primary-600 p-2.5 text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
          aria-label="Add bank"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={openAdd}
          className="hidden rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 lg:inline-flex"
        >
          Add bank
        </button>
      </div>

      {listError ? (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {listError}
        </div>
      ) : null}

      <div className={`space-y-3 lg:hidden ${loading ? 'opacity-70' : ''}`}>
        {!ready ? (
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 h-5 w-36 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-700/50" />
                <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700/50" />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            No banks yet. Tap + to add bank details.
          </div>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {row.qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote R2 URL
                    <img
                      src={row.qrCodeUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-gray-200 object-contain p-0.5 dark:border-gray-600"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                      {row.bankName}
                    </h2>
                    <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">
                      {row.accountTitle}
                    </p>
                  </div>
                </div>
                {actionsFor(row)}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Account number
                  </dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-gray-100">
                    {row.accountNumber}
                  </dd>
                </div>
                {row.iban ? (
                  <div className="col-span-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      IBAN
                    </dt>
                    <dd className="mt-0.5 break-all text-gray-800 dark:text-gray-200">
                      {row.iban}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Branch
                  </dt>
                  <dd className="mt-0.5 text-gray-800 dark:text-gray-200">
                    {row.branchName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.active
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  QR
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Bank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Account title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Account no.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  IBAN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {!ready ? (
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700/50" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No banks yet. Click Add bank to create one.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-3">
                      {row.qrCodeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote R2 URL
                        <img
                          src={row.qrCodeUrl}
                          alt=""
                          className="h-9 w-9 rounded border border-gray-200 object-contain dark:border-gray-600"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {row.bankName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.accountTitle}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-gray-800 dark:text-gray-200">
                      {row.accountNumber}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.iban || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {row.branchName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.active
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {row.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {actionsFor(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteConfirmId ? (
        <div className={formModalOverlayClass} role="presentation">
          <div
            className={`${formModalPanelClass} max-w-sm`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-bank-title"
            onClick={(e) => e.stopPropagation()}
          >
            <FormModalHeader
              titleId="delete-bank-title"
              title="Delete bank?"
              onClose={() => setDeleteConfirmId(null)}
            />
            <FormModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This permanently removes the bank details. You can add them again
                later if needed.
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

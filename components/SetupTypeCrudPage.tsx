'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import {
  createSetupType,
  deleteSetupType,
  fetchSetupTypes,
  getCachedSetupTypes,
  updateSetupType,
  type SetupTypeKind,
  type SetupTypeRecord,
} from '@/lib/setupTypes'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

type SetupTypeCrudPageProps = {
  title: string
  kind: SetupTypeKind
  singularLabel: string
  emptyHint: string
}

export default function SetupTypeCrudPage({
  title,
  kind,
  singularLabel,
  emptyHint,
}: SetupTypeCrudPageProps) {
  const cached = getCachedSetupTypes(kind)
  const [rows, setRows] = useState<SetupTypeRecord[]>(() => cached ?? [])
  const [ready, setReady] = useState(() => cached != null)
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadRows = useCallback(async () => {
    const hit = getCachedSetupTypes(kind)
    if (hit) {
      // Page switch: show cache immediately — no skeleton, no network.
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
  }, [loadRows])

  const openAdd = () => {
    setFormError(null)
    setEditingId(null)
    setName('')
    setCode('')
    setDescription('')
    setActive(true)
    setModalOpen(true)
  }

  const openEdit = (row: SetupTypeRecord) => {
    setFormError(null)
    setEditingId(row.id)
    setName(row.name)
    setCode(row.code)
    setDescription(row.description)
    setActive(row.active)
    setModalOpen(true)
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
    const trimmedCode = code.trim().toUpperCase()
    const trimmedDescription = description.trim()
    if (!trimmedName) {
      setFormError(`${singularLabel} name is required.`)
      return
    }
    if (!trimmedCode) {
      setFormError('Code is required.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    setLoading(true)
    try {
      const payload = {
        name: trimmedName,
        code: trimmedCode,
        description: trimmedDescription,
        active,
      }
      if (editingId) {
        const item = await updateSetupType(kind, editingId, payload)
        setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)))
      } else {
        const item = await createSetupType(kind, payload)
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
  )

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-gray-800 dark:text-gray-100 lg:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Stored in Supabase — manage {title.toLowerCase()} used across the ledger.
          </p>
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

      {/* Mobile cards */}
      <div className={`space-y-3 lg:hidden ${loading ? 'opacity-70' : ''}`}>
        {!ready ? (
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 h-5 w-28 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-700/50" />
                <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700/50" />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-500 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {emptyHint}
          </div>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                    {row.name}
                  </h2>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {row.code}
                  </p>
                </div>
                {actionsFor(row)}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2 min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Description
                  </dt>
                  <dd className="mt-0.5 break-words text-gray-800 dark:text-gray-200">
                    {row.description || '—'}
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
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300'
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
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-700 ${loading ? 'opacity-70' : ''}`}>
              {!ready ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {row.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600 dark:text-primary-400">
                      {row.code}
                    </td>
                    <td className="max-w-md truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {row.description || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/35 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {row.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">{actionsFor(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className={formModalOverlayClass}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-type-modal-title"
        >
          <div className={`${formModalPanelClass} max-w-md`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="setup-type-modal-title"
              title={editingId ? `Edit ${singularLabel}` : `Add ${singularLabel}`}
              onClose={closeModal}
            />
            <FormModalBody>
              {formError ? (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {formError}
                </div>
              ) : null}
              <form id="setup-type-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label
                    htmlFor="setup-name"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Name
                  </label>
                  <input
                    id="setup-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder={`e.g. ${singularLabel}`}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    htmlFor="setup-code"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Code
                  </label>
                  <input
                    id="setup-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. AST"
                  />
                </div>
                <div>
                  <label
                    htmlFor="setup-description"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Description
                  </label>
                  <textarea
                    id="setup-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className={`${inputClass} min-h-[80px] resize-y`}
                    placeholder="Optional notes…"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-600">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Inactive types stay hidden from new entries.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={active ? 'Active' : 'Inactive'}
                    onClick={() => setActive((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </form>
            </FormModalBody>
            <FormModalFooter>
              <button
                type="submit"
                form="setup-type-form"
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
          aria-labelledby="delete-confirm-title"
        >
          <div className={`${formModalPanelClass} max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <FormModalHeader
              titleId="delete-confirm-title"
              title={`Delete ${singularLabel}?`}
              onClose={() => setDeleteConfirmId(null)}
            />
            <FormModalBody>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This removes the type from Supabase. You can add it again later if needed.
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

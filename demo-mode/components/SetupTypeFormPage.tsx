'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import {
  createSetupType,
  fetchSetupTypes,
  getCachedSetupTypes,
  updateSetupType,
  type SetupTypeKind,
  type SetupTypeRecord,
} from '@/lib/setupTypes'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  return path
}

type SetupTypeFormPageProps = {
  kind: SetupTypeKind
  singularLabel: string
  listPath: string
  typeId?: string
  returnTo?: string | null
}

export default function SetupTypeFormPage({
  kind,
  singularLabel,
  listPath,
  typeId,
  returnTo,
}: SetupTypeFormPageProps) {
  const router = useRouter()
  const isEdit = Boolean(typeId)
  const [existing, setExisting] = useState<SetupTypeRecord | null>(() => {
    if (!typeId) return null
    return getCachedSetupTypes(kind)?.find((r) => r.id === typeId) ?? null
  })
  const [ready, setReady] = useState(() => !typeId || existing != null)
  const [name, setName] = useState(() => existing?.name ?? '')
  const [code, setCode] = useState(() => existing?.code ?? '')
  const [description, setDescription] = useState(() => existing?.description ?? '')
  const [active, setActive] = useState(() => existing?.active ?? true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const leaveTo = safeReturnPath(returnTo) ?? listPath
  const leave = useCallback(() => router.push(leaveTo), [router, leaveTo])

  const load = useCallback(async () => {
    if (!typeId) {
      setReady(true)
      return
    }
    setLoadError(null)
    try {
      const items = await fetchSetupTypes(kind)
      const found = items.find((r) => r.id === typeId) ?? null
      setExisting(found)
      if (found) {
        setName(found.name)
        setCode(found.code)
        setDescription(found.description)
        setActive(found.active)
      } else {
        setLoadError(`${singularLabel} not found.`)
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [kind, typeId, singularLabel])

  useEffect(() => {
    void load()
  }, [load])

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
    const payload = {
      name: trimmedName,
      code: trimmedCode,
      description: trimmedDescription,
      active,
    }
    try {
      if (isEdit && typeId) {
        await updateSetupType(kind, typeId, payload)
      } else {
        await createSetupType(kind, payload)
      }
      router.push(leaveTo)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEdit ? `Edit ${singularLabel}` : `Add ${singularLabel}`

  if (!ready) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
      </div>
    )
  }

  if (isEdit && (loadError || !existing)) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {loadError || `${singularLabel} not found.`}
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
                  className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  {isEdit
                    ? `Update this ${singularLabel.toLowerCase()}.`
                    : `Create a ${singularLabel.toLowerCase()} used across the ledger.`}
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
            Type details
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Name and code are required.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div>
            <label
              htmlFor="setup-name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Name *
            </label>
            <input
              id="setup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder={`e.g. ${singularLabel}`}
              autoFocus
              required
            />
          </div>
          <div>
            <label
              htmlFor="setup-code"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Code *
            </label>
            <input
              id="setup-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
              placeholder="e.g. AST"
              required
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
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

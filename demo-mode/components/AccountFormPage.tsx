'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import PhoneInput from '@/components/PhoneInput'
import {
  createAccount,
  fetchAccounts,
  getCachedAccounts,
  updateAccount,
  type AccountRecord,
} from '@/lib/accounts'
import {
  fetchSetupTypes,
  getCachedSetupTypes,
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

type AccountFormPageProps = {
  /** When set, form edits that account; otherwise creates a new one. */
  accountId?: string
  /** Preferred return path after save/cancel (must be an in-app path). */
  returnTo?: string | null
}

/**
 * Full-page Add / Edit Account form (replaces the Accounts list popup).
 */
export default function AccountFormPage({
  accountId,
  returnTo,
}: AccountFormPageProps) {
  const router = useRouter()
  const isEdit = Boolean(accountId)
  const [accountTypes, setAccountTypes] = useState<SetupTypeRecord[]>(() =>
    (getCachedSetupTypes('account-types') ?? []).filter((t) => t.active)
  )
  const [cashTypes, setCashTypes] = useState<SetupTypeRecord[]>(() =>
    (getCachedSetupTypes('cash-types') ?? []).filter((t) => t.active)
  )
  const [existing, setExisting] = useState<AccountRecord | null>(() => {
    if (!accountId) return null
    return getCachedAccounts()?.find((a) => a.id === accountId) ?? null
  })
  const [ready, setReady] = useState(() => {
    if (!accountId) return true
    return getCachedAccounts()?.some((a) => a.id === accountId) ?? false
  })
  const [name, setName] = useState(() => existing?.name ?? '')
  const [phone, setPhone] = useState(() => existing?.phone ?? '')
  const [accountTypeId, setAccountTypeId] = useState(
    () => existing?.accountTypeId ?? ''
  )
  const [cashTypeId, setCashTypeId] = useState(() => existing?.cashTypeId ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const defaultReturn = isEdit && accountId ? `/accounts/${accountId}` : '/accounts'
  const leaveTo = safeReturnPath(returnTo) ?? defaultReturn

  const leave = useCallback(() => {
    router.push(leaveTo)
  }, [router, leaveTo])

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [ats, cts, accounts] = await Promise.all([
        fetchSetupTypes('account-types'),
        fetchSetupTypes('cash-types'),
        accountId ? fetchAccounts() : Promise.resolve(getCachedAccounts() ?? []),
      ])
      const activeAts = ats.filter((t) => t.active)
      const activeCts = cts.filter((t) => t.active)
      setAccountTypes(activeAts)
      setCashTypes(activeCts)

      if (accountId) {
        const found = accounts.find((a) => a.id === accountId) ?? null
        setExisting(found)
        if (found) {
          setName(found.name)
          setPhone(found.phone)
          setAccountTypeId(found.accountTypeId)
          setCashTypeId(found.cashTypeId)
        } else {
          setLoadError('Account not found.')
        }
      } else {
        setAccountTypeId((prev) => prev || activeAts[0]?.id || '')
        setCashTypeId((prev) => prev || activeCts[0]?.id || '')
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [accountId])

  useEffect(() => {
    void load()
  }, [load])

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
    const payload = {
      name: trimmedName,
      phone: phone.trim(),
      accountTypeId,
      cashTypeId,
    }
    try {
      if (isEdit && accountId) {
        await updateAccount(accountId, payload)
        router.push(leaveTo)
      } else {
        const item = await createAccount(payload)
        router.push(`/accounts/${item.id}`)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEdit ? 'Edit Account' : 'Add Account'
  const infoText = isEdit
    ? 'Update this account’s name, phone, and types.'
    : 'Create a ledger account with name, phone, and types.'

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Edit Account
          </h1>
        </div>
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {loadError || 'Account not found.'}
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
                  {infoText}
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
            Account details
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Required fields are marked with *.
          </p>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div>
            <label
              htmlFor="acc-name"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              ACC Name *
            </label>
            <input
              id="acc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Cash Counter, Customer ABC"
              autoFocus
              required
            />
          </div>
          <div>
            <label
              htmlFor="acc-phone"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Phone Number
            </label>
            <PhoneInput
              id="acc-phone"
              value={phone}
              onChange={setPhone}
              inputClassName={inputClass}
              placeholder="e.g. 3059778976"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pick country code (default Pakistan +92). Saved as international
              format for WhatsApp.
            </p>
          </div>
          <div>
            <label
              htmlFor="acc-type"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              ACC Type *
            </label>
            <select
              id="acc-type"
              value={accountTypeId}
              onChange={(e) => setAccountTypeId(e.target.value)}
              className={inputClass}
              required
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
              Cash Type *
            </label>
            <select
              id="cash-type"
              value={cashTypeId}
              onChange={(e) => setCashTypeId(e.target.value)}
              className={inputClass}
              required
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

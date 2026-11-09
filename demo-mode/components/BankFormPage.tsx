'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import {
  createBank,
  fetchBanks,
  getCachedBanks,
  updateBank,
  type BankDetailRecord,
} from '@/lib/banks'
import {
  BRAND_IMAGE_EXTENSIONS,
  isBrandImageName,
  uploadFileToR2,
} from '@/lib/uploads'

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

const labelClass =
  'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'

const actionBtnClass =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

const qrAccept = BRAND_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const emptyForm = {
  bankName: '',
  accountTitle: '',
  accountNumber: '',
  iban: '',
  branchName: '',
  branchCode: '',
  swiftCode: '',
  notes: '',
  qrCodeUrl: null as string | null,
  active: true,
}

function safeReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  return path
}

type BankFormPageProps = {
  bankId?: string
  returnTo?: string | null
}

export default function BankFormPage({ bankId, returnTo }: BankFormPageProps) {
  const router = useRouter()
  const isEdit = Boolean(bankId)
  const listPath = '/settings/bank-details'
  const [existing, setExisting] = useState<BankDetailRecord | null>(() => {
    if (!bankId) return null
    return getCachedBanks()?.find((r) => r.id === bankId) ?? null
  })
  const [ready, setReady] = useState(() => !bankId || existing != null)
  const [form, setForm] = useState(() =>
    existing
      ? {
          bankName: existing.bankName,
          accountTitle: existing.accountTitle,
          accountNumber: existing.accountNumber,
          iban: existing.iban,
          branchName: existing.branchName,
          branchCode: existing.branchCode,
          swiftCode: existing.swiftCode,
          notes: existing.notes,
          qrCodeUrl: existing.qrCodeUrl,
          active: existing.active,
        }
      : emptyForm
  )
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const qrInputRef = useRef<HTMLInputElement | null>(null)

  const leaveTo = safeReturnPath(returnTo) ?? listPath
  const leave = useCallback(() => router.push(leaveTo), [router, leaveTo])

  const load = useCallback(async () => {
    if (!bankId) {
      setReady(true)
      return
    }
    setLoadError(null)
    try {
      const items = await fetchBanks()
      const found = items.find((r) => r.id === bankId) ?? null
      setExisting(found)
      if (found) {
        setForm({
          bankName: found.bankName,
          accountTitle: found.accountTitle,
          accountNumber: found.accountNumber,
          iban: found.iban,
          branchName: found.branchName,
          branchCode: found.branchCode,
          swiftCode: found.swiftCode,
          notes: found.notes,
          qrCodeUrl: found.qrCodeUrl,
          active: found.active,
        })
      } else {
        setLoadError('Bank not found.')
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setReady(true)
    }
  }, [bankId])

  useEffect(() => {
    void load()
  }, [load])

  const setField = <K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleQrUpload = async (file: File | undefined) => {
    if (!file) return
    if (!isBrandImageName(file.name)) {
      setFormError(`Use an image file (${BRAND_IMAGE_EXTENSIONS.join(', ')}).`)
      return
    }
    setQrUploading(true)
    setFormError(null)
    try {
      const attachment = await uploadFileToR2(file, {
        folder: 'banks/qr',
        compress: { maxEdge: 1200, quality: 0.88 },
      })
      setForm((prev) => ({ ...prev, qrCodeUrl: attachment.publicUrl }))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'QR upload failed.')
    } finally {
      setQrUploading(false)
      if (qrInputRef.current) qrInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        bankName: form.bankName.trim(),
        accountTitle: form.accountTitle.trim(),
        accountNumber: form.accountNumber.trim(),
        iban: form.iban.trim(),
        branchName: form.branchName.trim(),
        branchCode: form.branchCode.trim(),
        swiftCode: form.swiftCode.trim(),
        notes: form.notes.trim(),
        qrCodeUrl: form.qrCodeUrl,
        active: form.active,
      }
      if (isEdit && bankId) {
        await updateBank(bankId, payload)
      } else {
        await createBank(payload)
      }
      router.push(leaveTo)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEdit ? 'Edit bank' : 'Add bank'

  if (!ready) {
    return (
      <div className="w-full p-4 lg:p-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
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
          {loadError || 'Bank not found.'}
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
                  Save business bank details for receipts, vouchers, and sharing.
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
            Bank details
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Required fields are marked with *.
          </p>
        </div>
        <div className="space-y-3 px-4 py-4 sm:px-6">
          <div>
            <label className={labelClass} htmlFor="bank-name">
              Bank name <span className="text-red-600">*</span>
            </label>
            <input
              id="bank-name"
              className={inputClass}
              value={form.bankName}
              onChange={(e) => setField('bankName', e.target.value)}
              placeholder="e.g. Habib Bank Limited"
              required
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="account-title">
              Account title <span className="text-red-600">*</span>
            </label>
            <input
              id="account-title"
              className={inputClass}
              value={form.accountTitle}
              onChange={(e) => setField('accountTitle', e.target.value)}
              placeholder="Account holder name"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="account-number">
              Account number <span className="text-red-600">*</span>
            </label>
            <input
              id="account-number"
              className={inputClass}
              value={form.accountNumber}
              onChange={(e) => setField('accountNumber', e.target.value)}
              placeholder="Account number"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="iban">
              IBAN
            </label>
            <input
              id="iban"
              className={inputClass}
              value={form.iban}
              onChange={(e) => setField('iban', e.target.value)}
              placeholder="PK00XXXX…"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="branch-name">
                Branch name
              </label>
              <input
                id="branch-name"
                className={inputClass}
                value={form.branchName}
                onChange={(e) => setField('branchName', e.target.value)}
                placeholder="Branch"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="branch-code">
                Branch code
              </label>
              <input
                id="branch-code"
                className={inputClass}
                value={form.branchCode}
                onChange={(e) => setField('branchCode', e.target.value)}
                placeholder="Code"
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="swift-code">
              SWIFT / BIC
            </label>
            <input
              id="swift-code"
              className={inputClass}
              value={form.swiftCode}
              onChange={(e) => setField('swiftCode', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="bank-qr">
              Bank QR code
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50">
                {form.qrCodeUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote R2 URL
                  <img
                    src={form.qrCodeUrl}
                    alt="Bank QR preview"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="px-1 text-center text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                    No QR
                  </span>
                )}
              </div>
              <input
                ref={qrInputRef}
                id="bank-qr"
                type="file"
                accept={qrAccept}
                className="sr-only"
                disabled={submitting || qrUploading}
                onChange={(e) => {
                  void handleQrUpload(e.target.files?.[0])
                }}
              />
              <button
                type="button"
                disabled={submitting || qrUploading}
                onClick={() => qrInputRef.current?.click()}
                className={actionBtnClass}
              >
                {qrUploading
                  ? 'Uploading…'
                  : form.qrCodeUrl
                    ? 'Replace QR'
                    : 'Upload QR'}
              </button>
              {form.qrCodeUrl ? (
                <button
                  type="button"
                  disabled={submitting || qrUploading}
                  onClick={() => setField('qrCodeUrl', null)}
                  className={actionBtnClass}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="bank-notes">
              Notes
            </label>
            <textarea
              id="bank-notes"
              className={`${inputClass} min-h-[72px] resize-y`}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField('active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Active
          </label>
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
            disabled={submitting || qrUploading}
            className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

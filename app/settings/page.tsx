'use client'

import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalOverlayClass,
  formModalPanelClass,
  formModalPrimaryButtonClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import {
  defaultCashSavingsAccountTypeIds,
  defaultCashSavingsCashTypeIds,
  defaultLoanAccountTypeIds,
} from '@/lib/accountFilters'
import {
  DEFAULT_APP_SETTINGS,
  fetchAppSettings,
  saveAppSettings,
  type DefaultEntryMode,
} from '@/lib/appSettings'
import {
  downloadAccountImportTemplate,
  downloadTransactionImportTemplate,
  exportAccountsCsv,
  exportTransactionsCsv,
  importAccountsFromCsvFile,
  importTransactionsFromCsvFile,
  type ImportProgress,
} from '@/lib/dataImportExport'
import {
  ACCOUNT_MESSAGE_VARS,
  TRANSACTION_MESSAGE_VARS,
} from '@/lib/messageTemplates'
import {
  fetchSetupTypes,
  getCachedSetupTypes,
  type SetupTypeRecord,
} from '@/lib/setupTypes'
import {
  applyThemePreference,
  getDefaultTheme,
  type ThemePreference,
} from '@/lib/theme'
import {
  BRAND_IMAGE_EXTENSIONS,
  isBrandImageName,
  uploadFileToR2,
} from '@/lib/uploads'

const actionBtnClass =
  'inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

const primaryActionBtnClass =
  'inline-flex h-9 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

const inputClass =
  'w-full sm:w-72 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

const infoHintPanelClass =
  'absolute left-0 z-50 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'

/** Info tip without a full-screen overlay (that would block modal scrolling). */
function InfoHint({
  label,
  placement = 'below',
  children,
}: {
  label: string
  placement?: 'above' | 'below'
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    // Capture scroll from FormModalBody / page without eating wheel events.
    const onScroll = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          open
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
        }`}
        aria-label={`About ${label}`}
        aria-expanded={open}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open ? (
        <div
          role="dialog"
          className={`${infoHintPanelClass} ${
            placement === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

function SettingRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 dark:border-gray-700">
      <div className="min-w-0 flex-1 text-left sm:max-w-sm lg:max-w-md">
        <div className="flex items-center gap-1.5">
          {htmlFor ? (
            <label
              htmlFor={htmlFor}
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {label}
            </label>
          ) : (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {label}
            </span>
          )}
          {description ? <InfoHint label={label}>{description}</InfoHint> : null}
        </div>
      </div>
      <div className="flex w-full shrink-0 justify-end sm:w-auto sm:min-w-[14rem] sm:max-w-xl">
        {children}
      </div>
    </div>
  )
}

const brandAccept = BRAND_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const messageTextareaClass =
  'w-full min-h-[10rem] resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

const messageNoteInputClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'

type MessageNoteDrafts = {
  plus: string
  minus: string
  zero: string
}

type ShareUrlOptionConfig = {
  key: string
  title: string
  variable: string
  enabled: boolean
}

type MessageTemplateSavePayload = MessageNoteDrafts & {
  shareUrlEnabled?: Record<string, boolean>
}

function shareUrlEnabledMap(options: ShareUrlOptionConfig[]): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  for (const opt of options) next[opt.key] = opt.enabled
  return next
}

function MessageTemplateModal({
  open,
  title,
  description,
  value,
  notes,
  variables,
  shareUrlOptions = [],
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  description: string
  value: string
  notes: MessageNoteDrafts
  variables: readonly { key: string; label: string }[]
  /** Zero or more Allow-URL toggles (transaction PDF, account ledger, …). */
  shareUrlOptions?: ShareUrlOptionConfig[]
  onClose: () => void
  onSave: (next: string, payload: MessageTemplateSavePayload) => void
}) {
  const [draft, setDraft] = useState(value)
  const [notePlus, setNotePlus] = useState(notes.plus)
  const [noteMinus, setNoteMinus] = useState(notes.minus)
  const [noteZero, setNoteZero] = useState(notes.zero)
  const [shareUrlAllowed, setShareUrlAllowed] = useState(() =>
    shareUrlEnabledMap(shareUrlOptions)
  )
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const shareUrlOptionsKey = shareUrlOptions
    .map((o) => `${o.key}:${o.enabled ? 1 : 0}`)
    .join('|')

  useEffect(() => {
    if (!open) return
    setDraft(value)
    setNotePlus(notes.plus)
    setNoteMinus(notes.minus)
    setNoteZero(notes.zero)
    setShareUrlAllowed(shareUrlEnabledMap(shareUrlOptions))
    // shareUrlOptions identity changes every render; key tracks enabled values.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareUrlOptionsKey
  }, [open, value, notes.plus, notes.minus, notes.zero, shareUrlOptionsKey])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`
    const el = textareaRef.current
    if (!el) {
      setDraft((prev) => `${prev}${token}`)
      return
    }
    const start = el.selectionStart ?? draft.length
    const end = el.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + token + draft.slice(end)
    setDraft(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div
      className={formModalOverlayClass}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${formModalPanelClass} sm:max-w-lg`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-template-title"
        onClick={(e) => e.stopPropagation()}
      >
        <FormModalHeader
          title={title}
          titleId="message-template-title"
          onClose={onClose}
        />
        <FormModalBody>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{description}</p>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Insert variable
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
          <label htmlFor="messageTemplateDraft" className="sr-only">
            Message template
          </label>
          <textarea
            ref={textareaRef}
            id="messageTemplateDraft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={messageTextareaClass}
            placeholder="Write your message… click variables above to insert."
            maxLength={4000}
          />
          <p className="mt-1.5 text-right text-[11px] text-gray-400">
            {draft.length}/4000
          </p>

          <div className="mt-5 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Balance notes for {'{{note}}'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Only the matching line is inserted: plus, minus, or zero balance.
            </p>
            <div>
              <label
                htmlFor="messageNotePlus"
                className="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-200"
              >
                Plus (+) note
              </label>
              <input
                id="messageNotePlus"
                type="text"
                value={notePlus}
                onChange={(e) => setNotePlus(e.target.value)}
                className={messageNoteInputClass}
                maxLength={500}
                placeholder="Shown when balance is positive"
              />
            </div>
            <div>
              <label
                htmlFor="messageNoteMinus"
                className="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-200"
              >
                Minus (−) note
              </label>
              <input
                id="messageNoteMinus"
                type="text"
                value={noteMinus}
                onChange={(e) => setNoteMinus(e.target.value)}
                className={messageNoteInputClass}
                maxLength={500}
                placeholder="Shown when balance is negative"
              />
            </div>
            <div>
              <label
                htmlFor="messageNoteZero"
                className="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-200"
              >
                Zero / clear note
              </label>
              <input
                id="messageNoteZero"
                type="text"
                value={noteZero}
                onChange={(e) => setNoteZero(e.target.value)}
                className={messageNoteInputClass}
                maxLength={500}
                placeholder="Shown when balance is zero"
              />
            </div>

            {shareUrlOptions.length > 0 ? (
              <div className="space-y-2">
                {shareUrlOptions.map((opt) => {
                  const enabled = shareUrlAllowed[opt.key] !== false
                  return (
                    <div
                      key={opt.key}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-600"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                          {opt.title}
                        </p>
                        <InfoHint label={opt.title} placement="above">
                          When enabled, Send message saves a PDF and fills{' '}
                          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] dark:bg-gray-700">
                            {`{{${opt.variable}}}`}
                          </code>{' '}
                          with a short public link (no ads).
                        </InfoHint>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={
                          enabled ? `${opt.title} enabled` : `${opt.title} disabled`
                        }
                        onClick={() =>
                          setShareUrlAllowed((prev) => ({
                            ...prev,
                            [opt.key]: !enabled,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                          enabled
                            ? 'bg-primary-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </FormModalBody>
        <FormModalFooter>
          <button type="button" className={formModalSecondaryButtonClass} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={formModalPrimaryButtonClass}
            onClick={() => {
              onSave(draft, {
                plus: notePlus,
                minus: noteMinus,
                zero: noteZero,
                ...(shareUrlOptions.length > 0
                  ? { shareUrlEnabled: { ...shareUrlAllowed } }
                  : {}),
              })
              onClose()
            }}
          >
            Apply
          </button>
        </FormModalFooter>
      </div>
    </div>
  )
}

function BrandAssetField({
  id,
  label,
  description,
  value,
  previewClassName,
  disabled,
  onUploaded,
  onClear,
  onError,
}: {
  id: string
  label: string
  description: string
  value: string | null
  previewClassName: string
  disabled?: boolean
  onUploaded: (url: string) => void
  onClear: () => void
  onError: (message: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!isBrandImageName(file.name)) {
      onError(`Use an image file (${BRAND_IMAGE_EXTENSIONS.join(', ')}).`)
      return
    }
    setUploading(true)
    try {
      const attachment = await uploadFileToR2(file, {
        folder: 'branding',
        compress: { maxEdge: 1600, quality: 0.82 },
      })
      onUploaded(attachment.publicUrl)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex shrink-0 items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </label>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setHintOpen((v) => !v)}
            className={`rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              hintOpen
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'
            }`}
            aria-label={`About ${label}`}
            aria-expanded={hintOpen}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
          {hintOpen ? (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setHintOpen(false)}
                aria-hidden
              />
              <div
                role="dialog"
                className="absolute left-0 top-full z-50 mt-1.5 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                {description}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote R2 branding URL
            <img src={value} alt="" className={previewClassName} />
          ) : (
            <span className="text-[10px] leading-none text-gray-400 dark:text-gray-500">
              —
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={brandAccept}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            void handleFile(file)
          }}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={actionBtnClass}
        >
          {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        {value ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={onClear}
            className={actionBtnClass}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(DEFAULT_APP_SETTINGS.businessName)
  const [currency, setCurrency] = useState(DEFAULT_APP_SETTINGS.currency)
  const [theme, setTheme] = useState<ThemePreference>(getDefaultTheme())
  const [defaultEntryMode, setDefaultEntryMode] = useState<DefaultEntryMode>(
    DEFAULT_APP_SETTINGS.defaultEntryMode
  )
  const [logoUrl, setLogoUrl] = useState<string | null>(DEFAULT_APP_SETTINGS.logoUrl)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(DEFAULT_APP_SETTINGS.faviconUrl)
  const [accountMessageTemplate, setAccountMessageTemplate] = useState(
    DEFAULT_APP_SETTINGS.accountMessageTemplate
  )
  const [transactionMessageTemplate, setTransactionMessageTemplate] = useState(
    DEFAULT_APP_SETTINGS.transactionMessageTemplate
  )
  const [messageNotePlus, setMessageNotePlus] = useState(DEFAULT_APP_SETTINGS.messageNotePlus)
  const [messageNoteMinus, setMessageNoteMinus] = useState(
    DEFAULT_APP_SETTINGS.messageNoteMinus
  )
  const [messageNoteZero, setMessageNoteZero] = useState(DEFAULT_APP_SETTINGS.messageNoteZero)
  const [accountMessageIncludeLedgerUrl, setAccountMessageIncludeLedgerUrl] = useState(
    DEFAULT_APP_SETTINGS.accountMessageIncludeLedgerUrl
  )
  const [transactionMessageIncludePdfUrl, setTransactionMessageIncludePdfUrl] = useState(
    DEFAULT_APP_SETTINGS.transactionMessageIncludePdfUrl
  )
  const [transactionMessageIncludeLedgerUrl, setTransactionMessageIncludeLedgerUrl] =
    useState(DEFAULT_APP_SETTINGS.transactionMessageIncludeLedgerUrl)
  const [messageEditor, setMessageEditor] = useState<'account' | 'transaction' | null>(null)
  const [cashSavingsCashTypeIds, setCashSavingsCashTypeIds] = useState<string[]>(
    () => DEFAULT_APP_SETTINGS.cashSavingsCashTypeIds
  )
  const [cashSavingsAccountTypeIds, setCashSavingsAccountTypeIds] = useState<string[]>(
    () => DEFAULT_APP_SETTINGS.cashSavingsAccountTypeIds
  )
  const [payableReceivableCashTypeIds, setPayableReceivableCashTypeIds] = useState<
    string[]
  >(() => DEFAULT_APP_SETTINGS.payableReceivableCashTypeIds)
  const [payableReceivableAccountTypeIds, setPayableReceivableAccountTypeIds] =
    useState<string[]>(() => DEFAULT_APP_SETTINGS.payableReceivableAccountTypeIds)
  const [cashTypes, setCashTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('cash-types') ?? []).filter((t) => t.active)
  )
  const [accountTypes, setAccountTypes] = useState<SetupTypeRecord[]>(
    () => (getCachedSetupTypes('account-types') ?? []).filter((t) => t.active)
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importingAccounts, setImportingAccounts] = useState(false)
  const [exportingAccounts, setExportingAccounts] = useState(false)
  const [importingTransactions, setImportingTransactions] = useState(false)
  const [exportingTransactions, setExportingTransactions] = useState(false)
  const [accountImportProgress, setAccountImportProgress] = useState<ImportProgress | null>(
    null
  )
  const [transactionImportProgress, setTransactionImportProgress] =
    useState<ImportProgress | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const accountFileRef = useRef<HTMLInputElement | null>(null)
  const transactionFileRef = useRef<HTMLInputElement | null>(null)

  const renderImportProgress = (progress: ImportProgress | null) => {
    if (!progress) return null
    return (
      <div className="mt-2 w-full min-w-[12rem] sm:w-72">
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span>
            {progress.processed}/{progress.total} rows · imported {progress.imported}
          </span>
          <span className="font-semibold tabular-nums text-primary-600 dark:text-primary-400">
            {progress.percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-primary-600 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
          />
        </div>
      </div>
    )
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [settings, cashTypeRows, accountTypeRows] = await Promise.all([
          fetchAppSettings(),
          fetchSetupTypes('cash-types'),
          fetchSetupTypes('account-types'),
        ])
        if (cancelled) return
        const activeCashTypes = cashTypeRows.filter((t) => t.active)
        const activeAccountTypes = accountTypeRows.filter((t) => t.active)
        setCashTypes(activeCashTypes)
        setAccountTypes(activeAccountTypes)
        setBusinessName(settings.businessName)
        setCurrency(settings.currency)
        setTheme(settings.theme)
        setDefaultEntryMode(settings.defaultEntryMode)
        setLogoUrl(settings.logoUrl)
        setFaviconUrl(settings.faviconUrl)
        setAccountMessageTemplate(settings.accountMessageTemplate)
        setTransactionMessageTemplate(settings.transactionMessageTemplate)
        setMessageNotePlus(settings.messageNotePlus)
        setMessageNoteMinus(settings.messageNoteMinus)
        setMessageNoteZero(settings.messageNoteZero)
        setAccountMessageIncludeLedgerUrl(settings.accountMessageIncludeLedgerUrl)
        setTransactionMessageIncludePdfUrl(settings.transactionMessageIncludePdfUrl)
        setTransactionMessageIncludeLedgerUrl(settings.transactionMessageIncludeLedgerUrl)
        applyThemePreference(settings.theme)

        const pickSavedOrDefault = (
          savedCash: string[],
          savedAccount: string[],
          defaultCash: string[],
          defaultAccount: string[]
        ) => {
          const cash = savedCash.filter((id) =>
            activeCashTypes.some((t) => t.id === id)
          )
          const account = savedAccount.filter((id) =>
            activeAccountTypes.some((t) => t.id === id)
          )
          const hasAny = cash.length > 0 || account.length > 0
          return {
            cash: hasAny ? cash : defaultCash,
            account: hasAny ? account : defaultAccount,
          }
        }

        const cashSavings = pickSavedOrDefault(
          settings.cashSavingsCashTypeIds,
          settings.cashSavingsAccountTypeIds,
          defaultCashSavingsCashTypeIds(activeCashTypes),
          defaultCashSavingsAccountTypeIds(activeAccountTypes)
        )
        setCashSavingsCashTypeIds(cashSavings.cash)
        setCashSavingsAccountTypeIds(cashSavings.account)

        const payableReceivable = pickSavedOrDefault(
          settings.payableReceivableCashTypeIds,
          settings.payableReceivableAccountTypeIds,
          [],
          defaultLoanAccountTypeIds(activeAccountTypes)
        )
        setPayableReceivableCashTypeIds(payableReceivable.cash)
        setPayableReceivableAccountTypeIds(payableReceivable.account)
      } catch (err) {
        if (cancelled) return
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to load settings.',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const name = businessName.trim()
    if (!name) {
      setMessage({ type: 'error', text: 'Business name is required.' })
      return
    }
    if (
      cashSavingsCashTypeIds.length === 0 &&
      cashSavingsAccountTypeIds.length === 0
    ) {
      setMessage({
        type: 'error',
        text: 'Select at least one Account Type or Cash Type for Cash & Savings.',
      })
      return
    }
    if (
      payableReceivableCashTypeIds.length === 0 &&
      payableReceivableAccountTypeIds.length === 0
    ) {
      setMessage({
        type: 'error',
        text: 'Select at least one Account Type or Cash Type for Payable & Receivable.',
      })
      return
    }
    setSaving(true)
    try {
      const saved = await saveAppSettings({
        businessName: name,
        currency,
        theme,
        defaultEntryMode,
        logoUrl,
        faviconUrl,
        accountMessageTemplate,
        transactionMessageTemplate,
        messageNotePlus,
        messageNoteMinus,
        messageNoteZero,
        accountMessageIncludeLedgerUrl,
        transactionMessageIncludePdfUrl,
        transactionMessageIncludeLedgerUrl,
        cashSavingsCashTypeIds,
        cashSavingsAccountTypeIds,
        payableReceivableCashTypeIds,
        payableReceivableAccountTypeIds,
      })
      setBusinessName(saved.businessName)
      setCurrency(saved.currency)
      setTheme(saved.theme)
      setDefaultEntryMode(saved.defaultEntryMode)
      setLogoUrl(saved.logoUrl)
      setFaviconUrl(saved.faviconUrl)
      setAccountMessageTemplate(saved.accountMessageTemplate)
      setTransactionMessageTemplate(saved.transactionMessageTemplate)
      setMessageNotePlus(saved.messageNotePlus)
      setMessageNoteMinus(saved.messageNoteMinus)
      setMessageNoteZero(saved.messageNoteZero)
      setAccountMessageIncludeLedgerUrl(saved.accountMessageIncludeLedgerUrl)
      setTransactionMessageIncludePdfUrl(saved.transactionMessageIncludePdfUrl)
      setTransactionMessageIncludeLedgerUrl(saved.transactionMessageIncludeLedgerUrl)
      setCashSavingsCashTypeIds(saved.cashSavingsCashTypeIds)
      setCashSavingsAccountTypeIds(saved.cashSavingsAccountTypeIds)
      setPayableReceivableCashTypeIds(saved.payableReceivableCashTypeIds)
      setPayableReceivableAccountTypeIds(saved.payableReceivableAccountTypeIds)
      applyThemePreference(saved.theme)
      setMessage({ type: 'success', text: 'Settings saved.' })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save settings.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full p-4 lg:p-8">
      <form
        onSubmit={(e) => void handleSave(e)}
        className={loading ? 'opacity-70 pointer-events-none' : ''}
      >
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Settings
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
                aria-label="About Settings"
                aria-expanded={infoOpen}
                aria-controls="settings-info-popover"
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
                    id="settings-info-popover"
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    Business profile and display preferences for this app.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90">
          <SettingRow
            label="Business name"
            description="Shown in the sidebar and header when no logo is set."
            htmlFor="businessName"
          >
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
              placeholder="Your company name"
              autoComplete="organization"
            />
          </SettingRow>

          <div className="grid grid-cols-1 divide-y divide-gray-200 border-b border-gray-200 dark:divide-gray-700 dark:border-gray-700 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-4">
              <BrandAssetField
                id="businessLogo"
                label="Logo"
                description="Optional. When uploaded, replaces the business name in the header and sidebar."
                value={logoUrl}
                previewClassName="h-7 max-w-full object-contain"
                disabled={saving || loading}
                onUploaded={(url) => {
                  setLogoUrl(url)
                  setMessage(null)
                }}
                onClear={() => setLogoUrl(null)}
                onError={(text) => setMessage({ type: 'error', text })}
              />
            </div>
            <div className="px-4 py-4">
              <BrandAssetField
                id="businessFavicon"
                label="Favicon"
                description="Optional. Browser tab icon for this app. PNG, ICO, or SVG work best."
                value={faviconUrl}
                previewClassName="h-7 w-7 object-contain"
                disabled={saving || loading}
                onUploaded={(url) => {
                  setFaviconUrl(url)
                  setMessage(null)
                }}
                onClear={() => setFaviconUrl(null)}
                onError={(text) => setMessage({ type: 'error', text })}
              />
            </div>
          </div>

          <SettingRow
            label="Default currency"
            description="Used for balances and amounts across the app."
            htmlFor="currency"
          >
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="PKR">PKR — Pakistani Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="AED">AED — UAE Dirham</option>
            </select>
          </SettingRow>

          <SettingRow label="Theme" description="App appearance preference.">
            <div className="flex flex-wrap justify-end gap-2">
              {(['light', 'dark'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setTheme(option)
                    applyThemePreference(option)
                  }}
                  className={`rounded-md border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    theme === option
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Default transaction entry mode"
            description="Pre-selected when you open Add Transaction. You can still switch on the form."
          >
            <div className="flex flex-wrap justify-end gap-2">
              {(
                [
                  { id: 'normal' as const, label: 'Normal Entry' },
                  { id: 'transfer' as const, label: 'Transfer' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDefaultEntryMode(option.id)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    defaultEntryMode === option.id
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Cash & Savings"
            description="Accounts that match any selected Account Type or Cash Type are totaled on the dashboard card and Cash & Savings page."
          >
            <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:w-[28rem]">
              <MultiSelectDropdown
                id="cashSavingsAccountTypes"
                label="Account Type"
                values={cashSavingsAccountTypeIds}
                onChange={setCashSavingsAccountTypeIds}
                options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Account Types"
              />
              <MultiSelectDropdown
                id="cashSavingsCashTypes"
                label="Cash Type"
                values={cashSavingsCashTypeIds}
                onChange={setCashSavingsCashTypeIds}
                options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Cash Types"
              />
            </div>
          </SettingRow>

          <SettingRow
            label="Payable & Receivable"
            description="Matching accounts are split by balance: minus → Payable, plus → Receivable on the dashboard cards and pages."
          >
            <div className="flex w-full min-w-0 flex-row items-start gap-3 sm:w-[28rem]">
              <MultiSelectDropdown
                id="payableReceivableAccountTypes"
                label="Account Type"
                values={payableReceivableAccountTypeIds}
                onChange={setPayableReceivableAccountTypeIds}
                options={accountTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Account Types"
              />
              <MultiSelectDropdown
                id="payableReceivableCashTypes"
                label="Cash Type"
                values={payableReceivableCashTypeIds}
                onChange={setPayableReceivableCashTypeIds}
                options={cashTypes.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Select…"
                emptyMessage="No active Cash Types"
              />
            </div>
          </SettingRow>

          <SettingRow
            label="Account import & export"
            description="Import CSV: name, phone, account_type, cash_type. Export includes current balance. Types match by name or code; duplicate names are skipped on import."
          >
            <div className="flex w-full flex-col items-end gap-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  ref={accountFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setMessage(null)
                    setImportingAccounts(true)
                    setAccountImportProgress({
                      percent: 0,
                      processed: 0,
                      total: 0,
                      imported: 0,
                      skipped: 0,
                      errorCount: 0,
                    })
                    void importAccountsFromCsvFile(file, setAccountImportProgress)
                      .then((result) => {
                        const extra =
                          result.errorCount > 0
                            ? ` ${result.errorCount} row error(s).`
                            : ''
                        setMessage({
                          type:
                            result.imported > 0 || result.errorCount === 0
                              ? 'success'
                              : 'error',
                          text: `Accounts: imported ${result.imported}, skipped ${result.skipped}.${extra}`,
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text: err instanceof Error ? err.message : 'Account import failed.',
                        })
                      })
                      .finally(() => {
                        setImportingAccounts(false)
                        setAccountImportProgress(null)
                      })
                  }}
                />
                <button
                  type="button"
                  className={actionBtnClass}
                  onClick={() => downloadAccountImportTemplate()}
                >
                  Template
                </button>
                <button
                  type="button"
                  className={actionBtnClass}
                  disabled={exportingAccounts || loading || importingAccounts}
                  onClick={() => {
                    setMessage(null)
                    setExportingAccounts(true)
                    void exportAccountsCsv()
                      .then(() => {
                        setMessage({
                          type: 'success',
                          text: 'Accounts exported to CSV (with current balance).',
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text:
                            err instanceof Error ? err.message : 'Account export failed.',
                        })
                      })
                      .finally(() => setExportingAccounts(false))
                  }}
                >
                  {exportingAccounts ? 'Exporting…' : 'Export'}
                </button>
                <button
                  type="button"
                  className={primaryActionBtnClass}
                  disabled={importingAccounts || loading}
                  onClick={() => accountFileRef.current?.click()}
                >
                  {importingAccounts
                    ? `Importing ${accountImportProgress?.percent ?? 0}%`
                    : 'Import CSV'}
                </button>
              </div>
              {renderImportProgress(accountImportProgress)}
            </div>
          </SettingRow>

          <SettingRow
            label="Transaction import & export"
            description="CSV columns: transaction_date (YYYY-MM-DD), account_name, narration, entry_type (credit/debit), amount. Import matches accounts by name."
          >
            <div className="flex w-full flex-col items-end gap-1">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <input
                  ref={transactionFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    setMessage(null)
                    setImportingTransactions(true)
                    setTransactionImportProgress({
                      percent: 0,
                      processed: 0,
                      total: 0,
                      imported: 0,
                      skipped: 0,
                      errorCount: 0,
                    })
                    void importTransactionsFromCsvFile(file, setTransactionImportProgress)
                      .then((result) => {
                        const extra =
                          result.errorCount > 0
                            ? ` ${result.errorCount} row error(s).`
                            : ''
                        setMessage({
                          type:
                            result.imported > 0 || result.errorCount === 0
                              ? 'success'
                              : 'error',
                          text: `Transactions: imported ${result.imported}, skipped ${result.skipped}.${extra}`,
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text:
                            err instanceof Error
                              ? err.message
                              : 'Transaction import failed.',
                        })
                      })
                      .finally(() => {
                        setImportingTransactions(false)
                        setTransactionImportProgress(null)
                      })
                  }}
                />
                <button
                  type="button"
                  className={actionBtnClass}
                  onClick={() => downloadTransactionImportTemplate()}
                >
                  Template
                </button>
                <button
                  type="button"
                  className={actionBtnClass}
                  disabled={exportingTransactions || loading || importingTransactions}
                  onClick={() => {
                    setMessage(null)
                    setExportingTransactions(true)
                    void exportTransactionsCsv()
                      .then(() => {
                        setMessage({
                          type: 'success',
                          text: 'Transactions exported to CSV.',
                        })
                      })
                      .catch((err) => {
                        setMessage({
                          type: 'error',
                          text:
                            err instanceof Error
                              ? err.message
                              : 'Transaction export failed.',
                        })
                      })
                      .finally(() => setExportingTransactions(false))
                  }}
                >
                  {exportingTransactions ? 'Exporting…' : 'Export'}
                </button>
                <button
                  type="button"
                  className={primaryActionBtnClass}
                  disabled={importingTransactions || loading}
                  onClick={() => transactionFileRef.current?.click()}
                >
                  {importingTransactions
                    ? `Importing ${transactionImportProgress?.percent ?? 0}%`
                    : 'Import CSV'}
                </button>
              </div>
              {renderImportProgress(transactionImportProgress)}
            </div>
          </SettingRow>

          <SettingRow
            label="Send messages"
            description="Templates for WhatsApp send on Accounts and Transactions. Use {{variables}} for name, balance, amount, and more."
          >
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={actionBtnClass}
                disabled={saving || loading}
                onClick={() => setMessageEditor('account')}
              >
                {accountMessageTemplate.trim() ? 'Edit account' : 'Account message'}
              </button>
              <button
                type="button"
                className={actionBtnClass}
                disabled={saving || loading}
                onClick={() => setMessageEditor('transaction')}
              >
                {transactionMessageTemplate.trim()
                  ? 'Edit transaction'
                  : 'Transaction message'}
              </button>
            </div>
          </SettingRow>
        </div>

        <MessageTemplateModal
          open={messageEditor === 'account'}
          title="Account message"
          description="Used when sending from the Accounts page. Click a variable to insert it at the cursor."
          value={accountMessageTemplate}
          notes={{
            plus: messageNotePlus,
            minus: messageNoteMinus,
            zero: messageNoteZero,
          }}
          variables={ACCOUNT_MESSAGE_VARS}
          shareUrlOptions={[
            {
              key: 'ledger_url',
              title: 'Ledger PDF link',
              variable: 'ledger_url',
              enabled: accountMessageIncludeLedgerUrl,
            },
          ]}
          onClose={() => setMessageEditor(null)}
          onSave={(next, notes) => {
            setAccountMessageTemplate(next)
            setMessageNotePlus(notes.plus)
            setMessageNoteMinus(notes.minus)
            setMessageNoteZero(notes.zero)
            if (typeof notes.shareUrlEnabled?.ledger_url === 'boolean') {
              setAccountMessageIncludeLedgerUrl(notes.shareUrlEnabled.ledger_url)
            }
          }}
        />
        <MessageTemplateModal
          open={messageEditor === 'transaction'}
          title="Transaction message"
          description="Used when sending from the Transactions page. Click a variable to insert it at the cursor."
          value={transactionMessageTemplate}
          notes={{
            plus: messageNotePlus,
            minus: messageNoteMinus,
            zero: messageNoteZero,
          }}
          variables={TRANSACTION_MESSAGE_VARS}
          shareUrlOptions={[
            {
              key: 'pdf_url',
              title: 'Transaction PDF link',
              variable: 'pdf_url',
              enabled: transactionMessageIncludePdfUrl,
            },
            {
              key: 'ledger_url',
              title: 'Account ledger PDF link',
              variable: 'ledger_url',
              enabled: transactionMessageIncludeLedgerUrl,
            },
          ]}
          onClose={() => setMessageEditor(null)}
          onSave={(next, notes) => {
            setTransactionMessageTemplate(next)
            setMessageNotePlus(notes.plus)
            setMessageNoteMinus(notes.minus)
            setMessageNoteZero(notes.zero)
            if (typeof notes.shareUrlEnabled?.pdf_url === 'boolean') {
              setTransactionMessageIncludePdfUrl(notes.shareUrlEnabled.pdf_url)
            }
            if (typeof notes.shareUrlEnabled?.ledger_url === 'boolean') {
              setTransactionMessageIncludeLedgerUrl(notes.shareUrlEnabled.ledger_url)
            }
          }}
        />

        {message ? (
          <p
            className={`mt-4 text-sm ${
              message.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}
      </form>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Info } from 'lucide-react'
import {
  FormModalBody,
  FormModalFooter,
  FormModalHeader,
  formModalOverlayClass,
  formModalPanelClass,
  formModalPrimaryButtonClass,
  formModalSecondaryButtonClass,
} from '@/components/FormModal'
import {
  BRAND_IMAGE_EXTENSIONS,
  isBrandImageName,
  uploadFileToR2,
} from '@/lib/uploads'

export const actionBtnClass =
  'inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

export const primaryActionBtnClass =
  'inline-flex h-9 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50'

export const inputClass =
  'w-full sm:w-72 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500'

const infoHintPanelClass =
  'absolute left-0 z-50 w-64 max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'

/** Info tip without a full-screen overlay (that would block modal scrolling). */
export function InfoHint({
  label,
  placement = 'below',
  tone = 'default',
  children,
}: {
  label: string
  placement?: 'above' | 'below'
  /** `onBrand` for white header bars (primary gradient). */
  tone?: 'default' | 'onBrand'
  children: ReactNode
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

  const buttonClass =
    tone === 'onBrand'
      ? open
        ? 'text-white'
        : 'text-white/80 hover:text-white'
      : open
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400'

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={`rounded-full p-0.5 focus:outline-none focus:ring-2 ${
          tone === 'onBrand' ? 'focus:ring-white/50' : 'focus:ring-primary-500'
        } ${buttonClass}`}
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

export function SettingRow({
  label,
  description,
  htmlFor,
  children,
  /** Keep label + controls on one row on mobile (Theme, toggles, …). */
  inline = false,
}: {
  label: string
  description?: string
  htmlFor?: string
  children: ReactNode
  inline?: boolean
}) {
  return (
    <div
      className={`flex border-b border-gray-200 px-4 py-4 last:border-b-0 dark:border-gray-700 ${
        inline
          ? 'min-w-0 flex-row items-center justify-between gap-2 sm:gap-6'
          : 'flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6'
      }`}
    >
      <div
        className={`min-w-0 text-left ${
          inline
            ? 'min-w-0 flex-1 truncate sm:flex-none sm:max-w-[12rem]'
            : 'flex-1 sm:max-w-sm lg:max-w-md'
        }`}
      >
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
      <div
        className={`flex min-w-0 justify-end ${
          inline
            ? 'shrink-0'
            : 'w-full sm:w-auto sm:min-w-[14rem] sm:max-w-xl'
        }`}
      >
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

export function MessageTemplateModal({
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
  /** Persist to the server; modal stays open on error. */
  onSave: (next: string, payload: MessageTemplateSavePayload) => void | Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [notePlus, setNotePlus] = useState(notes.plus)
  const [noteMinus, setNoteMinus] = useState(notes.minus)
  const [noteZero, setNoteZero] = useState(notes.zero)
  const [shareUrlAllowed, setShareUrlAllowed] = useState(() =>
    shareUrlEnabledMap(shareUrlOptions)
  )
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
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
    setSavingTemplate(false)
    setSaveError(null)
    // shareUrlOptions identity changes every render; key tracks enabled values.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shareUrlOptionsKey
  }, [open, value, notes.plus, notes.minus, notes.zero, shareUrlOptionsKey])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingTemplate) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, savingTemplate])

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
    <div className={formModalOverlayClass} role="presentation">
      <div
        className={`${formModalPanelClass} sm:max-w-lg`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-template-title"
      >
        <FormModalHeader
          title={
            <>
              <span className="truncate">{title}</span>
              <InfoHint label={title} placement="below" tone="onBrand">
                {description}
              </InfoHint>
            </>
          }
          titleId="message-template-title"
          onClose={onClose}
        />
        <FormModalBody>
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
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Balance notes for {'{{note}}'}
              </p>
              <InfoHint label="Balance notes" placement="above">
                Only the matching line is inserted into the message: plus (+), minus (−), or
                zero balance — based on the account or running balance.
              </InfoHint>
            </div>
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
                          When enabled, Send message creates a PIN-gated ledger
                          preview and fills{' '}
                          <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px] dark:bg-gray-700">
                            {`{{${opt.variable}}}`}
                          </code>{' '}
                          (plus access code and expiry).
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
        {saveError ? (
          <p className="border-t border-gray-200 px-4 py-2 text-sm text-red-600 dark:border-gray-700 dark:text-red-400 sm:px-6">
            {saveError}
          </p>
        ) : null}
        <FormModalFooter>
          <button
            type="button"
            className={formModalSecondaryButtonClass}
            onClick={onClose}
            disabled={savingTemplate}
          >
            Cancel
          </button>
          <button
            type="button"
            className={formModalPrimaryButtonClass}
            disabled={savingTemplate}
            onClick={() => {
              void (async () => {
                setSavingTemplate(true)
                setSaveError(null)
                try {
                  await onSave(draft, {
                    plus: notePlus,
                    minus: noteMinus,
                    zero: noteZero,
                    ...(shareUrlOptions.length > 0
                      ? { shareUrlEnabled: { ...shareUrlAllowed } }
                      : {}),
                  })
                  onClose()
                } catch (err) {
                  setSaveError(
                    err instanceof Error ? err.message : 'Could not save message template.'
                  )
                } finally {
                  setSavingTemplate(false)
                }
              })()
            }}
          >
            {savingTemplate ? 'Saving…' : 'Save'}
          </button>
        </FormModalFooter>
      </div>
    </div>
  )
}

export function BrandAssetField({
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
    <div className="flex min-w-0 flex-row items-center justify-between gap-3 sm:gap-4">
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


export function SettingsDetailShell({
  title,
  info,
  children,
  saving,
  onSave,
  showSave = true,
  message,
}: {
  title: string
  info?: string
  children: ReactNode
  saving?: boolean
  onSave?: () => void | Promise<void>
  showSave?: boolean
  message?: { type: 'success' | 'error'; text: string } | null
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <div className="w-full p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:mb-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/settings"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Back to settings"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {info ? (
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
                  <div className="fixed inset-0 z-40" onClick={() => setInfoOpen(false)} aria-hidden />
                  <div
                    role="dialog"
                    className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {info}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        {showSave && onSave ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="inline-flex h-10 shrink-0 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : null}
      </div>
      {children}
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
    </div>
  )
}

export function SettingsNavRow({
  href,
  label,
  description,
  value,
}: {
  href: string
  label: string
  description?: string
  value?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-primary-50/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:border-gray-700 dark:hover:bg-gray-700/40 dark:focus-visible:bg-primary-950/30"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </span>
          {description ? <InfoHint label={label}>{description}</InfoHint> : null}
        </div>
        {value ? (
          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {value}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500"
        aria-hidden
      />
    </Link>
  )
}

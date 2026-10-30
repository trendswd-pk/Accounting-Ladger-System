'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import TransactionDocumentsPanel from '@/components/TransactionDocumentsPanel'
import {
  formatUploadSize,
  UPLOAD_MAX_BYTES,
  uploadFileToR2,
  transactionAttachmentFolder,
} from '@/lib/uploads'

const pickBtnClass =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

type TransactionFormAttachmentsProps = {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  /** When editing an existing row, list/manage already-uploaded files. */
  existingTransactionId?: string | null
  inputId?: string
}

export default function TransactionFormAttachments({
  files,
  onChange,
  disabled = false,
  existingTransactionId = null,
  inputId = 'txn-attachments',
}: TransactionFormAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)

  if (existingTransactionId) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          Documents <span className="font-normal text-gray-400">(optional)</span>
        </p>
        <TransactionDocumentsPanel transactionId={existingTransactionId} />
      </div>
    )
  }

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    setPickError(null)
    const next = [...files]
    const skipped: string[] = []
    for (const file of Array.from(list)) {
      if (!file.name.trim()) {
        skipped.push('unnamed file')
        continue
      }
      if (file.size <= 0) {
        skipped.push(`${file.name} (empty)`)
        continue
      }
      if (file.size > UPLOAD_MAX_BYTES) {
        skipped.push(`${file.name} (over 100MB)`)
        continue
      }
      const dup = next.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      )
      if (!dup) next.push(file)
    }
    onChange(next)
    if (skipped.length > 0) {
      setPickError(`Skipped: ${skipped.join(', ')}`)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Documents <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <button
            type="button"
            className={pickBtnClass}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {files.length > 0 ? 'Add more files' : 'Upload files'}
          </button>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Optional. Any type, multiple files (max 100MB each).
        </p>
      </div>

      {pickError ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {pickError}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-gray-800"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                  {file.name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatUploadSize(file.size)} · pending
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                onClick={() => removeAt(index)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Upload staged files to one or more transaction folders (e.g. transfer debit + credit). */
export async function uploadPendingTransactionFiles(
  transactionIds: string[],
  files: File[]
): Promise<void> {
  const ids = transactionIds.map((id) => String(id).trim()).filter(Boolean)
  if (ids.length === 0 || files.length === 0) return
  // Parallel uploads — save UX no longer awaits this path for closing the modal.
  await Promise.all(
    ids.flatMap((id) => {
      const folder = transactionAttachmentFolder(id)
      return files.map((file) => uploadFileToR2(file, { folder }))
    })
  )
}

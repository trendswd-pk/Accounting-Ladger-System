'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import {
  deleteUploadedFile,
  formatUploadSize,
  getCachedUploadedFiles,
  listUploadedFiles,
  setCachedUploadedFiles,
  transactionAttachmentFolder,
  uploadFileToR2,
  type FileAttachment,
} from '@/lib/uploads'

const actionBtnClass =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

type TransactionDocumentsPanelProps = {
  transactionId: string
  /** Called whenever the file list changes (for tab badges, etc.). */
  onFilesChange?: (files: FileAttachment[]) => void
  /** When false, still loads/prefetches but stays visually hidden. */
  active?: boolean
}

export default function TransactionDocumentsPanel({
  transactionId,
  onFilesChange,
  active = true,
}: TransactionDocumentsPanelProps) {
  const folder = transactionAttachmentFolder(transactionId)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cached = getCachedUploadedFiles(folder)
  const [files, setFiles] = useState<FileAttachment[]>(() => cached ?? [])
  const [loading, setLoading] = useState(() => cached == null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const onFilesChangeRef = useRef(onFilesChange)
  onFilesChangeRef.current = onFilesChange

  const publish = useCallback((next: FileAttachment[]) => {
    setFiles(next)
    setCachedUploadedFiles(folder, next)
    onFilesChangeRef.current?.(next)
  }, [folder])

  const load = useCallback(
    async (opts?: { force?: boolean; silent?: boolean }) => {
      setError(null)
      if (!opts?.silent && getCachedUploadedFiles(folder) == null) {
        setLoading(true)
      }
      try {
        const items = await listUploadedFiles(folder, { force: opts?.force })
        publish(items)
      } catch (err) {
        if (getCachedUploadedFiles(folder) == null) {
          publish([])
          setError(err instanceof Error ? err.message : 'Could not load files.')
        }
      } finally {
        setLoading(false)
      }
    },
    [folder, publish]
  )

  useEffect(() => {
    const hit = getCachedUploadedFiles(folder)
    if (hit) {
      setFiles(hit)
      setLoading(false)
      onFilesChangeRef.current?.(hit)
      // Soft refresh in background.
      void load({ force: true, silent: true })
      return
    }
    setLoading(true)
    void load()
  }, [folder, load])

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setUploading(true)
    setError(null)
    setProgress(0)
    try {
      const queue = Array.from(list)
      let done = 0
      const uploaded: FileAttachment[] = []
      await Promise.all(
        queue.map(async (file) => {
          const attachment = await uploadFileToR2(file, {
            folder,
            onProgress: (p) => {
              const approx = Math.round(((done + p / 100) / queue.length) * 100)
              setProgress(Math.min(99, approx))
            },
          })
          uploaded.push(attachment)
          done += 1
          setProgress(Math.round((done / queue.length) * 100))
        })
      )
      // Instant UI: prepend new rows, then reconcile from server.
      publish([...uploaded, ...files.filter((f) => !uploaded.some((u) => u.id === f.id))])
      void load({ force: true, silent: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    const prev = files
    publish(files.filter((f) => f.id !== id))
    try {
      await deleteUploadedFile(id)
    } catch (err) {
      publish(prev)
      setError(err instanceof Error ? err.message : 'Could not delete file.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={`space-y-3 ${active ? '' : 'hidden'}`} aria-hidden={!active}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Optional. Any type, multiple files (max 100MB each).
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              void handleFiles(e.target.files)
            }}
          />
          <button
            type="button"
            className={actionBtnClass}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploading
              ? progress != null
                ? `Uploading ${progress}%`
                : 'Uploading…'
              : 'Upload files'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading && files.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading files…</p>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          No documents yet. Upload files linked to this transaction.
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 bg-white px-3 py-2.5 dark:bg-gray-800"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <a
                  href={file.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
                >
                  {file.fileName}
                </a>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {formatUploadSize(file.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                disabled={deletingId === file.id || uploading}
                aria-label={`Delete ${file.fileName}`}
                onClick={() => void handleDelete(file.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

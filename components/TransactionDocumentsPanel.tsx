'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import {
  deleteUploadedFile,
  formatUploadSize,
  listUploadedFiles,
  transactionAttachmentFolder,
  uploadFileToR2,
  UPLOAD_ALLOWED_EXTENSIONS,
  type FileAttachment,
} from '@/lib/uploads'

const accept = UPLOAD_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const actionBtnClass =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

type TransactionDocumentsPanelProps = {
  transactionId: string
}

export default function TransactionDocumentsPanel({
  transactionId,
}: TransactionDocumentsPanelProps) {
  const folder = transactionAttachmentFolder(transactionId)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<FileAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const items = await listUploadedFiles(folder)
      setFiles(items)
    } catch (err) {
      setFiles([])
      setError(err instanceof Error ? err.message : 'Could not load files.')
    } finally {
      setLoading(false)
    }
  }, [folder])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const queue = Array.from(list)
      for (let i = 0; i < queue.length; i++) {
        const file = queue[i]
        setProgress(0)
        await uploadFileToR2(file, {
          folder,
          onProgress: setProgress,
        })
      }
      await load()
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
    try {
      await deleteUploadedFile(id)
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete file.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          PDF, images, and Office files. Multiple uploads allowed.
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
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

      {loading ? (
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

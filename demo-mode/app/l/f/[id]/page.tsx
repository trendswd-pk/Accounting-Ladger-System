'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { getStoredUploads } from '@/lib/demoStore'

function titleFromFileName(fileName: string): string {
  return (
    String(fileName ?? '')
      .trim()
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Shared document'
  )
}

function kindLabel(folder: string, fileName: string): string {
  const f = `${folder} ${fileName}`.toLowerCase()
  if (f.includes('ledger')) return 'Account ledger PDF'
  if (f.includes('transaction') || f.includes('voucher')) {
    return 'Transaction voucher PDF'
  }
  return 'Shared PDF document'
}

/** Demo Mode: branded open page (mirrors production share preview). */
export default function DemoFileShortLinkPage() {
  const params = useParams()
  const id = String(params?.id ?? '').trim()
  const [missing, setMissing] = useState(false)
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [folder, setFolder] = useState('')

  useEffect(() => {
    if (!id) {
      setMissing(true)
      return
    }
    try {
      const hit = getStoredUploads().find((f) => f.id === id)
      if (hit?.publicUrl) {
        setFileUrl(hit.publicUrl)
        setFileName(hit.fileName || '')
        setFolder(hit.folder || '')
        const t = window.setTimeout(() => {
          window.location.replace(hit.publicUrl)
        }, 900)
        return () => window.clearTimeout(t)
      }
    } catch {
      /* not signed in / empty */
    }
    setMissing(true)
  }, [id])

  const title = useMemo(() => titleFromFileName(fileName), [fileName])
  const badge = useMemo(
    () => kindLabel(folder, fileName),
    [folder, fileName]
  )

  if (missing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
        Link not found.
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5 py-10 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-brand-pistachio bg-white p-6 text-center shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <span className="mb-3 inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-400">
          {badge}
        </span>
        <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">
          {title || 'Opening document…'}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          Shared from Accounting Ledger. Open to view the PDF.
        </p>
        {fileUrl ? (
          <a
            href={fileUrl}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Open document
          </a>
        ) : null}
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Opening automatically…
        </p>
      </div>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getStoredShortLinks } from '@/lib/demoStore'

/** Demo Mode: branded open page for short links. */
export default function DemoShortLinkPage() {
  const params = useParams()
  const code = String(params?.code ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
  const [missing, setMissing] = useState(false)
  const [fileUrl, setFileUrl] = useState('')

  useEffect(() => {
    if (!code) {
      setMissing(true)
      return
    }
    const hit = getStoredShortLinks().find((r) => r.code === code)
    if (hit?.targetUrl) {
      setFileUrl(hit.targetUrl)
      const t = window.setTimeout(() => {
        window.location.replace(hit.targetUrl)
      }, 900)
      return () => window.clearTimeout(t)
    }
    setMissing(true)
  }, [code])

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
          Shared PDF document
        </span>
        <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Shared document
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

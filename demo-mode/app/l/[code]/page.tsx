'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getStoredShortLinks } from '@/lib/demoStore'

/** Demo Mode: resolve short link from localStorage and redirect (no ads). */
export default function DemoShortLinkPage() {
  const params = useParams()
  const code = String(params?.code ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!code) {
      setMissing(true)
      return
    }
    const hit = getStoredShortLinks().find((r) => r.code === code)
    if (hit?.targetUrl) {
      window.location.replace(hit.targetUrl)
      return
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
      Opening…
    </main>
  )
}

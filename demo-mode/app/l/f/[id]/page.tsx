'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getStoredUploads } from '@/lib/demoStore'

/** Demo Mode: redirect attachment id → stored publicUrl (may be data URL). */
export default function DemoFileShortLinkPage() {
  const params = useParams()
  const id = String(params?.id ?? '').trim()
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!id) {
      setMissing(true)
      return
    }
    try {
      const hit = getStoredUploads().find((f) => f.id === id)
      if (hit?.publicUrl) {
        window.location.replace(hit.publicUrl)
        return
      }
    } catch {
      /* not signed in / empty */
    }
    setMissing(true)
  }, [id])

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

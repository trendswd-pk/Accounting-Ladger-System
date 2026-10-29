'use client'

import { useEffect } from 'react'

/** Registers the root service worker so the app is installable (Add to Home Screen). */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* install still works via Add to Home Screen without SW on some browsers */
    })
  }, [])

  return null
}

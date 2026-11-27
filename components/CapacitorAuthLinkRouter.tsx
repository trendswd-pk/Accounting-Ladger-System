'use client'

import { useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const ALLOWED_HOSTS = new Set(['cash.trendswd.com', 'localhost', '127.0.0.1'])

function isAllowedAuthUrl(raw: string): URL | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!ALLOWED_HOSTS.has(url.hostname) && url.hostname !== window.location.hostname) {
      return null
    }
    // Auth email / App Link destinations we must open in the WebView.
    if (
      url.pathname === '/auth/callback' ||
      url.pathname.startsWith('/auth/callback/') ||
      url.pathname === '/auth/continue' ||
      url.pathname.startsWith('/auth/continue/') ||
      url.pathname === '/reset-password' ||
      url.pathname === '/forgot-password' ||
      url.searchParams.has('code') ||
      url.searchParams.has('token_hash') ||
      url.hash.includes('access_token')
    ) {
      return url
    }
    return null
  } catch {
    return null
  }
}

function navigateToAuthUrl(url: URL) {
  const target = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (target === current) return
  // Full navigation so /auth/callback route handler (or hash handler) always runs.
  window.location.assign(target)
}

/**
 * When an Android App Link opens the Capacitor shell, load the verification /
 * auth URL inside the WebView (remote server.url would otherwise stay on `/`).
 * Without the APK installed, the same https link opens in the browser as usual.
 */
export default function CapacitorAuthLinkRouter() {
  const handledLaunch = useRef(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const apply = (raw: string | undefined) => {
      if (!raw) return
      const url = isAllowedAuthUrl(raw)
      if (!url) return
      navigateToAuthUrl(url)
    }

    void CapApp.getLaunchUrl()
      .then((result) => {
        if (handledLaunch.current) return
        if (result?.url) {
          handledLaunch.current = true
          apply(result.url)
        }
      })
      .catch(() => undefined)

    const sub = CapApp.addListener('appUrlOpen', ({ url }) => {
      apply(url)
    })

    return () => {
      void sub.then((handle) => handle.remove())
    }
  }, [])

  return null
}

'use client'

import { useLayoutEffect } from 'react'
import {
  applyFaviconUrl,
  ensureAppSettingsLoaded,
  getCachedAppSettings,
  subscribeAppSettings,
} from '@/lib/appSettings'
import { initRequestProfiler } from '@/lib/requestProfiler'
import { applyThemePreference, getDefaultTheme } from '@/lib/theme'

/**
 * Applies theme + favicon from demo app settings (localStorage sandbox).
 * Owns the initial settings load for the app shell when a demo session exists.
 */
export default function ThemeInit() {
  useLayoutEffect(() => {
    initRequestProfiler()
    applyThemePreference(getDefaultTheme())
    applyFaviconUrl(getCachedAppSettings()?.faviconUrl)
    ensureAppSettingsLoaded()
    return subscribeAppSettings((s) => {
      applyThemePreference(s.theme)
      applyFaviconUrl(s.faviconUrl)
    })
  }, [])

  return null
}

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
 * Applies theme + favicon from Supabase app_settings (no localStorage).
 * Owns the initial /api/settings load for the app shell.
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

'use client'

import { useLayoutEffect } from 'react'
import { fetchAppSettings } from '@/lib/appSettings'
import { applyThemePreference, getDefaultTheme } from '@/lib/theme'

/**
 * Applies theme from Supabase app_settings (no localStorage).
 * Starts with default until the online settings row loads.
 */
export default function ThemeInit() {
  useLayoutEffect(() => {
    applyThemePreference(getDefaultTheme())
    let cancelled = false
    fetchAppSettings()
      .then((s) => {
        if (!cancelled) applyThemePreference(s.theme)
      })
      .catch(() => {
        // keep default theme if settings API is unavailable
      })
    return () => {
      cancelled = true
    }
  }, [])

  return null
}

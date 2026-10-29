export type ThemePreference = 'light' | 'dark'

/** App default when nothing is loaded from Supabase yet. */
export function getDefaultTheme(): ThemePreference {
  return 'dark'
}

/** Apply theme to document only (persistence is via Supabase app_settings). */
export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function getActiveThemePreference(): ThemePreference {
  if (typeof document === 'undefined') return getDefaultTheme()
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

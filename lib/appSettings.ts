import { recordRequestDeduped } from '@/lib/requestProfiler'
import type { ThemePreference } from '@/lib/theme'

export type DefaultEntryMode = 'normal' | 'transfer'

export type AppSettings = {
  businessName: string
  currency: string
  theme: ThemePreference
  defaultEntryMode: DefaultEntryMode
  updatedAt?: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: 'My Business',
  currency: 'PKR',
  theme: 'dark',
  defaultEntryMode: 'normal',
}

type DbRow = {
  business_name: string
  currency: string
  theme: string
  default_entry_mode?: string | null
  updated_at?: string
}

export function normalizeDefaultEntryMode(value: unknown): DefaultEntryMode {
  return value === 'transfer' ? 'transfer' : 'normal'
}

export function mapAppSettingsRow(row: DbRow): AppSettings {
  const theme: ThemePreference = row.theme === 'light' ? 'light' : 'dark'
  return {
    businessName: row.business_name || DEFAULT_APP_SETTINGS.businessName,
    currency: row.currency || DEFAULT_APP_SETTINGS.currency,
    theme,
    defaultEntryMode: normalizeDefaultEntryMode(row.default_entry_mode),
    updatedAt: row.updated_at,
  }
}

const SETTINGS_ENDPOINT = '/api/settings'
const SETTINGS_CHANGED_EVENT = 'app-settings-changed'
let settingsInflight: Promise<AppSettings> | null = null
let settingsCache: AppSettings | null = null

export function invalidateAppSettingsCache(): void {
  settingsInflight = null
  settingsCache = null
}

export function getCachedAppSettings(): AppSettings | null {
  return settingsCache ? { ...settingsCache } : null
}

function notifySettingsChanged(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: settings }))
}

export function subscribeAppSettings(listener: (settings: AppSettings) => void): () => void {
  const handler = (e: Event) => {
    listener((e as CustomEvent<AppSettings>).detail)
  }
  window.addEventListener(SETTINGS_CHANGED_EVENT, handler)
  return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, handler)
}

export async function fetchAppSettings(): Promise<AppSettings> {
  if (settingsCache) {
    recordRequestDeduped(SETTINGS_ENDPOINT)
    return settingsCache
  }
  if (settingsInflight) {
    recordRequestDeduped(SETTINGS_ENDPOINT)
    return settingsInflight
  }

  const req = (async () => {
    const res = await fetch(SETTINGS_ENDPOINT, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Failed to load settings')
    }
    const settings = data.settings as AppSettings
    settingsCache = settings
    notifySettingsChanged(settings)
    return settings
  })()

  settingsInflight = req
  try {
    return await req
  } finally {
    if (settingsInflight === req) settingsInflight = null
  }
}

export async function saveAppSettings(
  input: Partial<
    Pick<AppSettings, 'businessName' | 'currency' | 'theme' | 'defaultEntryMode'>
  >
): Promise<AppSettings> {
  const res = await fetch(SETTINGS_ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save settings')
  }
  const settings = data.settings as AppSettings
  settingsCache = settings
  notifySettingsChanged(settings)
  return settings
}

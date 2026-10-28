import { recordRequestDeduped } from '@/lib/requestProfiler'
import type { ThemePreference } from '@/lib/theme'

export type AppSettings = {
  businessName: string
  currency: string
  theme: ThemePreference
  updatedAt?: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: 'My Business',
  currency: 'PKR',
  theme: 'dark',
}

type DbRow = {
  business_name: string
  currency: string
  theme: string
  updated_at?: string
}

export function mapAppSettingsRow(row: DbRow): AppSettings {
  const theme: ThemePreference = row.theme === 'light' ? 'light' : 'dark'
  return {
    businessName: row.business_name || DEFAULT_APP_SETTINGS.businessName,
    currency: row.currency || DEFAULT_APP_SETTINGS.currency,
    theme,
    updatedAt: row.updated_at,
  }
}

const SETTINGS_ENDPOINT = '/api/settings'
let settingsInflight: Promise<AppSettings> | null = null
let settingsCache: AppSettings | null = null

export function invalidateAppSettingsCache(): void {
  settingsInflight = null
  settingsCache = null
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
  input: Partial<Pick<AppSettings, 'businessName' | 'currency' | 'theme'>>
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
  return settings
}

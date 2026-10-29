import { recordRequestDeduped } from '@/lib/requestProfiler'
import type { ThemePreference } from '@/lib/theme'

export type DefaultEntryMode = 'normal' | 'transfer'

export type AppSettings = {
  businessName: string
  currency: string
  theme: ThemePreference
  defaultEntryMode: DefaultEntryMode
  /** Cash Type IDs included in Cash & Savings totals / page. */
  cashSavingsCashTypeIds: string[]
  /** Account Type IDs included in Cash & Savings totals / page. */
  cashSavingsAccountTypeIds: string[]
  updatedAt?: string
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  businessName: 'My Business',
  currency: 'PKR',
  theme: 'dark',
  defaultEntryMode: 'normal',
  cashSavingsCashTypeIds: [],
  cashSavingsAccountTypeIds: [],
}

type DbRow = {
  business_name: string
  currency: string
  theme: string
  default_entry_mode?: string | null
  cash_savings_cash_type_ids?: unknown
  cash_savings_account_type_ids?: unknown
  updated_at?: string
}

export function normalizeDefaultEntryMode(value: unknown): DefaultEntryMode {
  return value === 'transfer' ? 'transfer' : 'normal'
}

export function normalizeCashSavingsCashTypeIds(value: unknown): string[] {
  return normalizeUuidIdList(value)
}

export function normalizeCashSavingsAccountTypeIds(value: unknown): string[] {
  return normalizeUuidIdList(value)
}

function normalizeUuidIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const id = String(item ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    cashSavingsCashTypeIds: [...settings.cashSavingsCashTypeIds],
    cashSavingsAccountTypeIds: [...settings.cashSavingsAccountTypeIds],
  }
}

export function mapAppSettingsRow(row: DbRow): AppSettings {
  const theme: ThemePreference = row.theme === 'light' ? 'light' : 'dark'
  return {
    businessName: row.business_name || DEFAULT_APP_SETTINGS.businessName,
    currency: row.currency || DEFAULT_APP_SETTINGS.currency,
    theme,
    defaultEntryMode: normalizeDefaultEntryMode(row.default_entry_mode),
    cashSavingsCashTypeIds: normalizeCashSavingsCashTypeIds(
      row.cash_savings_cash_type_ids
    ),
    cashSavingsAccountTypeIds: normalizeCashSavingsAccountTypeIds(
      row.cash_savings_account_type_ids
    ),
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
  return settingsCache ? cloneSettings(settingsCache) : null
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
    return cloneSettings(settingsCache)
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
    settingsCache = {
      ...settings,
      cashSavingsCashTypeIds: settings.cashSavingsCashTypeIds ?? [],
      cashSavingsAccountTypeIds: settings.cashSavingsAccountTypeIds ?? [],
    }
    notifySettingsChanged(settingsCache)
    return cloneSettings(settingsCache)
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
    Pick<
      AppSettings,
      | 'businessName'
      | 'currency'
      | 'theme'
      | 'defaultEntryMode'
      | 'cashSavingsCashTypeIds'
      | 'cashSavingsAccountTypeIds'
    >
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
  settingsCache = {
    ...settings,
    cashSavingsCashTypeIds: settings.cashSavingsCashTypeIds ?? [],
    cashSavingsAccountTypeIds: settings.cashSavingsAccountTypeIds ?? [],
  }
  notifySettingsChanged(settingsCache)
  return cloneSettings(settingsCache)
}
